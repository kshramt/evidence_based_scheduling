package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"
	pgtype "github.com/jackc/pgx/v5/pgtype"
	pgxpool "github.com/jackc/pgx/v5/pgxpool"
	"github.com/sirupsen/logrus"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/bufbuild/connect-go"
	grpchealth "github.com/bufbuild/connect-grpchealth-go"
	grpcreflect "github.com/bufbuild/connect-grpcreflect-go"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	dbpkg "github.com/kshramt/evidence_based_scheduling/db"
	apiv1 "github.com/kshramt/evidence_based_scheduling/gen/api/v1"
	"github.com/kshramt/evidence_based_scheduling/gen/api/v1/apiv1connect"
	"github.com/kshramt/evidence_based_scheduling/idgens"
)

type Config struct {
	ConnString string
	ServerPort string
	LogLevel   string
}

type apiServer struct {
	queries *dbpkg.Queries
	db      *pgxpool.Pool
	idgen   *idgens.SortableIdGenerator
}

func getConfig() (Config, error) {
	cfg := Config{}
	var defined bool

	cfg.ConnString, defined = os.LookupEnv("MY_DB_URI")
	if !defined {
		return cfg, errors.New("environment variable MY_DB_URI is not defined")
	}

	cfg.ServerPort, defined = os.LookupEnv("SERVER_PORT")
	if !defined {
		cfg.ServerPort = "50051"
	}

	cfg.LogLevel, defined = os.LookupEnv("LOG_LEVEL")
	if !defined {
		cfg.LogLevel = "Info"
	}

	return cfg, nil
}

func (s *apiServer) FakeIdpCreateUser(ctx context.Context, req *connect.Request[apiv1.FakeIdpCreateUserRequest]) (*connect.Response[apiv1.FakeIdpCreateUserResponse], error) {
	if req.Msg.Name == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("name is nil"))
	}
	_user_id, err := s.idgen.Next()
	if err != nil {
		return nil, err
	}
	user_id := idgens.Base62(_user_id[:])
	return withTx(s, ctx, func(qtx *dbpkg.Queries) (*connect.Response[apiv1.FakeIdpCreateUserResponse], error) {
		err := qtx.FakeIdpCreateUser(ctx, &dbpkg.FakeIdpCreateUserParams{
			Name: *req.Msg.Name,
			ID:   user_id,
		})
		if err != nil {
			return nil, err
		}
		_, err = createUser(ctx, qtx, user_id)
		if err != nil {
			return nil, err
		}
		return connect.NewResponse(&apiv1.FakeIdpCreateUserResponse{
			Token: &apiv1.Token{UserId: &user_id},
		}), nil
	})
}

func (s *apiServer) FakeIdpGetIdToken(ctx context.Context, req *connect.Request[apiv1.FakeIdpGetIdTokenRequest]) (*connect.Response[apiv1.FakeIdpGetIdTokenResponse], error) {
	if req.Msg.Name == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("name is nil"))
	}
	return withTx(s, ctx, func(qtx *dbpkg.Queries) (*connect.Response[apiv1.FakeIdpGetIdTokenResponse], error) {
		res, err := qtx.FakeIdpGetUserByName(ctx, *req.Msg.Name)
		if err != nil {
			return nil, err
		}
		return connect.NewResponse(&apiv1.FakeIdpGetIdTokenResponse{Token: &apiv1.Token{UserId: &res.ID}}), nil
	})
}

// 1. Create a new user.
// 2. Create a new seq for the user.
// 3. Create the system client for the user.
// 4. Create the initial patch for the user.
func createUser(ctx context.Context, qtx *dbpkg.Queries, user_id string) (*connect.Response[apiv1.CreateUserResponse], error) {
	root_client_id := int64(0)
	root_session_id := int64(0)
	root_patch_id := int64(0)
	_, err := qtx.RawCreateUser(ctx, &dbpkg.RawCreateUserParams{
		ID:            user_id,
		HeadClientID:  root_client_id,
		HeadSessionID: root_session_id,
		HeadPatchID:   root_patch_id,
	})
	if err != nil {
		return nil, err
	}
	_, err = qtx.CreateSeq(ctx, user_id)
	if err != nil {
		return nil, err
	}
	{
		name := "System"
		_, err = createClient(ctx, qtx, user_id, 0, &name)
		if err != nil {
			return nil, err
		}
	}
	user_ids := []string{user_id}
	client_ids := []int64{int64(root_client_id)}
	session_ids := []int64{int64(root_session_id)}
	patch_ids := []int64{int64(root_patch_id)}
	patches := [][]byte{[]byte(`[{"op":"replace","path":"","value":{"data":null}}]`)}
	err = qtx.CreatePatches(ctx, &dbpkg.CreatePatchesParams{
		UserIds:          user_ids,
		ClientIds:        client_ids,
		SessionIds:       session_ids,
		PatchIds:         patch_ids,
		ParentClientIds:  client_ids,
		ParentSessionIds: session_ids,
		ParentPatchIds:   patch_ids,
		Patches:          patches,
		CreatedAts:       []pgtype.Timestamptz{{Time: time.Now(), Valid: true}},
	})
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&apiv1.CreateUserResponse{}), nil
}

func createClient(ctx context.Context, qtx *dbpkg.Queries, user_id string, client_id int64, name *string) (*connect.Response[apiv1.CreateClientResponse], error) {
	if name == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("name is nil"))
	}
	var err error
	if client_id == -1 {
		client_id, err = qtx.LastSeqValue(ctx, &dbpkg.LastSeqValueParams{UserID: user_id, Delta: 1})
		if err != nil {
			return nil, err
		}
	}
	err = qtx.CreateClient(ctx, &dbpkg.CreateClientParams{UserID: user_id, ClientID: client_id, Name: *name})
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&apiv1.CreateClientResponse{ClientId: &client_id}), nil
}

func (s *apiServer) CreateUser(ctx context.Context, req *connect.Request[apiv1.CreateUserRequest]) (*connect.Response[apiv1.CreateUserResponse], error) {
	if req.Msg.UserId == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("user_id is nil"))
	}
	return withTx(s, ctx, func(qtx *dbpkg.Queries) (*connect.Response[apiv1.CreateUserResponse], error) {
		return createUser(ctx, qtx, *req.Msg.UserId)
	})
}

func (s *apiServer) CreateClient(ctx context.Context, req *connect.Request[apiv1.CreateClientRequest]) (*connect.Response[apiv1.CreateClientResponse], error) {
	token, err := get_token(req)
	if err != nil {
		return nil, err
	}
	if req.Msg.Name == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("name is nil"))
	}
	return withTx(s, ctx, func(qtx *dbpkg.Queries) (*connect.Response[apiv1.CreateClientResponse], error) {
		return createClient(ctx, qtx, *token.UserId, -1, req.Msg.Name)
	})
}

func (s *apiServer) GetPendingPatches(ctx context.Context, req *connect.Request[apiv1.GetPendingPatchesRequest]) (*connect.Response[apiv1.GetPendingPatchesResponse], error) {
	token, err := get_token(req)
	if err != nil {
		return nil, err
	}
	if req.Msg.ClientId == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("client_id is nil"))
	}
	if req.Msg.Size == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("size is nil"))
	}
	patches, err := withTx(s, ctx, func(qtx *dbpkg.Queries) (*[]*dbpkg.GetPendingPatchesRow, error) {
		res, err := qtx.GetPendingPatches(ctx, &dbpkg.GetPendingPatchesParams{UserID: *token.UserId, ClientID: *req.Msg.ClientId, Limit: mini64(*req.Msg.Size, 10000)})
		return &res, err
	})
	if err != nil {
		return nil, err
	}
	res := &apiv1.GetPendingPatchesResponse{Patches: make([]*apiv1.Patch, 0, len(*patches))}
	for i := range *patches {
		patch := string((*patches)[i].Patch)
		res.Patches = append(res.Patches, &apiv1.Patch{
			ClientId:        &(*patches)[i].ClientID,
			SessionId:       &(*patches)[i].SessionID,
			PatchId:         &(*patches)[i].PatchID,
			ParentClientId:  &(*patches)[i].ParentClientID,
			ParentSessionId: &(*patches)[i].ParentSessionID,
			ParentPatchId:   &(*patches)[i].ParentPatchID,
			Patch:           &patch,
			CreatedAt:       timestamppb.New((*patches)[i].CreatedAt.Time),
		})
	}
	return connect.NewResponse(res), nil
}

func (s *apiServer) DeletePendingPatches(ctx context.Context, req *connect.Request[apiv1.DeletePendingPatchesRequest]) (*connect.Response[apiv1.DeletePendingPatchesResponse], error) {
	token, err := get_token(req)
	if err != nil {
		return nil, err
	}
	if req.Msg.ClientId == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("client_id is nil"))
	}
	n := len(req.Msg.Patches)
	user_ids := make([]string, 0, n)
	client_ids := make([]int64, 0, n)
	producer_client_ids := make([]int64, 0, n)
	producer_session_ids := make([]int64, 0, n)
	producer_patch_ids := make([]int64, 0, n)
	for i := range req.Msg.Patches {
		user_ids = append(user_ids, *token.UserId)
		client_ids = append(client_ids, *req.Msg.ClientId)
		if req.Msg.Patches[i].ClientId == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("producer_client_id is nil for patch %d", i))
		}
		producer_client_ids = append(producer_client_ids, *req.Msg.Patches[i].ClientId)
		if req.Msg.Patches[i].SessionId == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("producer_session_id is nil for patch %d", i))
		}
		producer_session_ids = append(producer_session_ids, *req.Msg.Patches[i].SessionId)
		if req.Msg.Patches[i].PatchId == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("producer_patch_id is nil for patch %d", i))
		}
		producer_patch_ids = append(producer_patch_ids, *req.Msg.Patches[i].PatchId)
	}
	return withTx(s, ctx, func(qtx *dbpkg.Queries) (*connect.Response[apiv1.DeletePendingPatchesResponse], error) {
		err = qtx.DeletePendingPatches(ctx, &dbpkg.DeletePendingPatchesParams{UserIds: user_ids, ClientIds: client_ids, ProducerClientIds: producer_client_ids, ProducerSessionIds: producer_session_ids, ProducerPatchIds: producer_patch_ids})
		if err != nil {
			return nil, err
		}
		return connect.NewResponse(&apiv1.DeletePendingPatchesResponse{}), nil
	})
}

func (s *apiServer) CreatePatches(ctx context.Context, req *connect.Request[apiv1.CreatePatchesRequest]) (*connect.Response[apiv1.CreatePatchesResponse], error) {
	token, err := get_token(req)
	if err != nil {
		return nil, err
	}
	n := len(req.Msg.Patches)
	user_ids := make([]string, 0, n)
	client_ids := make([]int64, 0, n)
	session_ids := make([]int64, 0, n)
	patch_ids := make([]int64, 0, n)
	parent_client_ids := make([]int64, 0, n)
	parent_session_ids := make([]int64, 0, n)
	parent_patch_ids := make([]int64, 0, n)
	patches := make([][]byte, 0, n)
	created_ats := make([]pgtype.Timestamptz, 0, n)
	for i := range req.Msg.Patches {
		user_ids = append(user_ids, *token.UserId)
		if req.Msg.Patches[i].ClientId == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("client_id is nil for patch %d", i))
		}
		client_ids = append(client_ids, *req.Msg.Patches[i].ClientId)
		if req.Msg.Patches[i].SessionId == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("session_id is nil for patch %d", i))
		}
		session_ids = append(session_ids, *req.Msg.Patches[i].SessionId)
		if req.Msg.Patches[i].PatchId == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("patch_id is nil for patch %d", i))
		}
		patch_ids = append(patch_ids, *req.Msg.Patches[i].PatchId)
		if req.Msg.Patches[i].ParentClientId == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("parent_client_id is nil for patch %d", i))
		}
		parent_client_ids = append(parent_client_ids, *req.Msg.Patches[i].ParentClientId)
		if req.Msg.Patches[i].ParentSessionId == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("parent_session_id is nil for patch %d", i))
		}
		parent_session_ids = append(parent_session_ids, *req.Msg.Patches[i].ParentSessionId)
		if req.Msg.Patches[i].ParentPatchId == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("parent_patch_id is nil for patch %d", i))
		}
		parent_patch_ids = append(parent_patch_ids, *req.Msg.Patches[i].ParentPatchId)
		if req.Msg.Patches[i].Patch == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("patch is nil for patch %d", i))
		}
		patches = append(patches, []byte(*req.Msg.Patches[i].Patch))
		if req.Msg.Patches[i].CreatedAt == nil {
			return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("created_at is nil for patch %d", i))
		}
		created_ats = append(created_ats, pgtype.Timestamptz{Time: req.Msg.Patches[i].CreatedAt.AsTime(), Valid: true})
	}
	return withTx(s, ctx, func(qtx *dbpkg.Queries) (*connect.Response[apiv1.CreatePatchesResponse], error) {
		err = qtx.CreatePatches(ctx, &dbpkg.CreatePatchesParams{
			UserIds:          user_ids,
			ClientIds:        client_ids,
			SessionIds:       session_ids,
			PatchIds:         patch_ids,
			ParentClientIds:  parent_client_ids,
			ParentSessionIds: parent_session_ids,
			ParentPatchIds:   parent_patch_ids,
			Patches:          patches,
			CreatedAts:       created_ats,
		})
		if err != nil {
			return nil, err
		}
		return connect.NewResponse(&apiv1.CreatePatchesResponse{}), nil
	})
}

func (s *apiServer) GetHead(ctx context.Context, req *connect.Request[apiv1.GetHeadRequest]) (*connect.Response[apiv1.GetHeadResponse], error) {
	token, err := get_token(req)
	if err != nil {
		return nil, err
	}
	res, err := withTx(s, ctx, func(qtx *dbpkg.Queries) (*dbpkg.GetHeadRow, error) {
		return qtx.GetHead(ctx, *token.UserId)
	})
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&apiv1.GetHeadResponse{
		ClientId:  &res.HeadClientID,
		SessionId: &res.HeadSessionID,
		PatchId:   &res.HeadPatchID,
		CreatedAt: timestamppb.New(res.CreatedAt.Time),
		Name:      &res.Name,
	}), nil
}

func (s *apiServer) UpdateHeadIfNotModified(ctx context.Context, req *connect.Request[apiv1.UpdateHeadIfNotModifiedRequest]) (*connect.Response[apiv1.UpdateHeadIfNotModifiedResponse], error) {
	token, err := get_token(req)
	if err != nil {
		return nil, err
	}
	if req.Msg.ClientId == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("client_id is nil"))
	}
	if req.Msg.SessionId == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("session_id is nil"))
	}
	if req.Msg.PatchId == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("patch_id is nil"))
	}
	if req.Msg.PrevClientId == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("prev_client_id is nil"))
	}
	if req.Msg.PrevSessionId == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("prev_session_id is nil"))
	}
	if req.Msg.PrevPatchId == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("prev_patch_id is nil"))
	}
	params := dbpkg.UpdateHeadIfNotModifiedParams{
		UserID:        *token.UserId,
		ClientID:      *req.Msg.ClientId,
		SessionID:     *req.Msg.SessionId,
		PatchID:       *req.Msg.PatchId,
		PrevClientID:  *req.Msg.PrevClientId,
		PrevSessionID: *req.Msg.PrevSessionId,
		PrevPatchID:   *req.Msg.PrevPatchId,
	}
	n_updated, err := withTx(s, ctx, func(qtx *dbpkg.Queries) (*int64, error) {
		n_updated, err := qtx.UpdateHeadIfNotModified(ctx, &params)
		if err != nil {
			return nil, err
		}
		return &n_updated, nil
	})
	if err != nil {
		return nil, err
	}
	is_updated := 0 < *n_updated
	return connect.NewResponse(&apiv1.UpdateHeadIfNotModifiedResponse{
		Updated: &is_updated,
	}), nil
}

func (s *apiServer) UpdateHead(ctx context.Context, req *connect.Request[apiv1.UpdateHeadRequest]) (*connect.Response[apiv1.UpdateHeadResponse], error) {
	token, err := get_token(req)
	if err != nil {
		return nil, err
	}
	if req.Msg.ClientId == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("client_id is nil"))
	}
	if req.Msg.SessionId == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("session_id is nil"))
	}
	if req.Msg.PatchId == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("patch_id is nil"))
	}
	params := dbpkg.UpdateHeadParams{
		UserID:    *token.UserId,
		ClientID:  *req.Msg.ClientId,
		SessionID: *req.Msg.SessionId,
		PatchID:   *req.Msg.PatchId,
	}
	return withTx(s, ctx, func(qtx *dbpkg.Queries) (*connect.Response[apiv1.UpdateHeadResponse], error) {
		err := qtx.UpdateHead(ctx, &params)
		if err != nil {
			return nil, err
		}
		return connect.NewResponse(&apiv1.UpdateHeadResponse{}), nil
	})
}

func withTx[Res any](s *apiServer, ctx context.Context, fn func(qtx *dbpkg.Queries) (*Res, error)) (*Res, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	qtx := s.queries.WithTx(tx)

	res, err := fn(qtx)
	if err != nil {
		return nil, err
	}
	err = tx.Commit(ctx)
	if err != nil {
		return nil, err
	}
	return res, nil
}

func mini64(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}

func get_token[Req any](req *connect.Request[Req]) (*apiv1.Token, error) {
	if req == nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("req is nil"))
	}
	authorization := req.Header().Get("authorization")
	if authorization == "" {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("no authorization"))
	}
	splitted := strings.Split(authorization, "Bearer ")
	if len(splitted) != 2 {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("invalid Bearer format"))
	}
	b64 := strings.TrimSpace(splitted[1])
	json_str, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("invalid base64"))
	}
	// Parse json_str
	var token apiv1.Token
	err = json.Unmarshal(json_str, &token)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("invalid json"))
	}
	// Validate token
	if token.UserId == nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("user_id is not set"))
	}
	return &token, nil
}

func run() error {
	cfg, err := getConfig()
	if err != nil {
		return fmt.Errorf("failed to get config: %w", err)
	}

	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: time.RFC3339Nano,
	})
	logger.SetOutput(os.Stdout)
	if level, err := logrus.ParseLevel(cfg.LogLevel); err == nil {
		logger.SetLevel(level)
	}

	ctx := context.Background()
	db, err := pgxpool.New(ctx, cfg.ConnString)
	if err != nil {
		return err
	}
	defer db.Close()

	queries := dbpkg.New(db)

	idgen := idgens.NewSortableIdGenerator(0)

	api_server := &apiServer{queries: queries, idgen: idgen, db: db}
	mux := http.NewServeMux()
	mux.Handle(apiv1connect.NewApiServiceHandler(api_server))
	mux.Handle(grpchealth.NewHandler(grpchealth.NewStaticChecker(apiv1connect.ApiServiceName)))
	mux.Handle(grpcreflect.NewHandlerV1(grpcreflect.NewStaticReflector(apiv1connect.ApiServiceName)))
	mux.Handle(grpcreflect.NewHandlerV1Alpha(grpcreflect.NewStaticReflector(apiv1connect.ApiServiceName)))
	srv := http.Server{
		Addr:              ":" + cfg.ServerPort,
		Handler:           h2c.NewHandler(mux, &http2.Server{}),
		ReadHeaderTimeout: 60 * time.Second,
	}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("listen: %s\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatalf("Server forced to shutdown: %s", err)
	}

	logger.Info("Server exited properly")

	return nil
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
