package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	pgtype "github.com/jackc/pgx/v5/pgtype"
	pgxpool "github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/kshramt/evidence_based_scheduling/api_v1_grpc"
	dbpkg "github.com/kshramt/evidence_based_scheduling/db"
	"github.com/kshramt/evidence_based_scheduling/idgens"
)

type apiServer struct {
	api_v1_grpc.UnimplementedApiServer
	queries *dbpkg.Queries
	db      *pgxpool.Pool
	idgen   *idgens.SortableIdGenerator
}

type token struct {
	UserId *string `json:"user_id"`
}

// 1. Create a new user.
// 2. Create a new seq for the user.
// 3. Create the system client for the user.
// 4. Create the initial patch for the user.
func createUser(ctx context.Context, qtx *dbpkg.Queries, user_id *string) (*api_v1_grpc.CreateUserResp, error) {
	if user_id == nil {
		return nil, status.Errorf(codes.InvalidArgument, "user_id is nil")
	}
	_, err := qtx.RawCreateUser(ctx, *user_id)
	if err != nil {
		return nil, err
	}
	_, err = qtx.CreateSeq(ctx, *user_id)
	if err != nil {
		return nil, err
	}
	{
		name := "System"
		_, err = createClient(ctx, qtx, *user_id, 0, &name)
		if err != nil {
			return nil, err
		}
	}
	user_ids := []string{*user_id}
	client_ids := []int64{0}
	session_ids := []int64{0}
	patch_ids := []int64{0}
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
	return &api_v1_grpc.CreateUserResp{}, nil
}

func createClient(ctx context.Context, qtx *dbpkg.Queries, user_id string, client_id int64, name *string) (*api_v1_grpc.CreateClientResp, error) {
	if name == nil {
		return nil, status.Errorf(codes.InvalidArgument, "name is nil")
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
	return &api_v1_grpc.CreateClientResp{ClientId: &client_id}, nil
}

func (s *apiServer) CreateUser(ctx context.Context, req *api_v1_grpc.CreateUserReq) (*api_v1_grpc.CreateUserResp, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	qtx := s.queries.WithTx(tx)
	res, err := createUser(ctx, qtx, req.UserId)
	if err != nil {
		return nil, err
	}
	tx.Commit(ctx)
	return res, nil
}

func (s *apiServer) CreateClient(ctx context.Context, req *api_v1_grpc.CreateClientReq) (*api_v1_grpc.CreateClientResp, error) {
	token, err := get_token(ctx)
	if err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	qtx := s.queries.WithTx(tx)
	res, err := createClient(ctx, qtx, *token.UserId, -1, req.Name)
	if err != nil {
		return nil, err
	}
	tx.Commit(ctx)
	return res, nil
}

func (s *apiServer) GetPendingPatches(ctx context.Context, req *api_v1_grpc.GetPendingPatchesReq) (*api_v1_grpc.GetPendingPatchesResp, error) {
	token, err := get_token(ctx)
	if err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	qtx := s.queries.WithTx(tx)

	if req.ClientId == nil {
		return nil, status.Errorf(codes.InvalidArgument, "client_id is nil")
	}
	if req.Size == nil {
		return nil, status.Errorf(codes.InvalidArgument, "size is nil")
	}
	patches, err := qtx.GetPendingPatches(ctx, &dbpkg.GetPendingPatchesParams{UserID: *token.UserId, ClientID: *req.ClientId, Limit: mini64(*req.Size, 200)})

	if err != nil {
		return nil, err
	}
	tx.Commit(ctx)
	res := &api_v1_grpc.GetPendingPatchesResp{Patches: make([]*api_v1_grpc.Patch, 0, len(patches))}
	fmt.Println(res, len(patches))
	for i := range patches {
		patch := string(patches[i].Patch)
		res.Patches = append(res.Patches, &api_v1_grpc.Patch{
			ClientId:        &patches[i].ClientID,
			SessionId:       &patches[i].SessionID,
			PatchId:         &patches[i].PatchID,
			ParentClientId:  &patches[i].ParentClientID,
			ParentSessionId: &patches[i].ParentSessionID,
			ParentPatchId:   &patches[i].ParentPatchID,
			Patch:           &patch,
			CreatedAt:       timestamppb.New(patches[i].CreatedAt.Time),
		})
	}
	return res, nil
}

func (s *apiServer) DeletePendingPatches(ctx context.Context, req *api_v1_grpc.DeletePendingPatchesReq) (*api_v1_grpc.DeletePendingPatchesResp, error) {
	token, err := get_token(ctx)
	if err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	qtx := s.queries.WithTx(tx)

	if req.ClientId == nil {
		return nil, status.Errorf(codes.InvalidArgument, "client_id is nil")
	}
	n := len(req.Patches)
	user_ids := make([]string, 0, n)
	client_ids := make([]int64, 0, n)
	producer_client_ids := make([]int64, 0, n)
	producer_session_ids := make([]int64, 0, n)
	producer_patch_ids := make([]int64, 0, n)
	for i := range req.Patches {
		user_ids = append(user_ids, *token.UserId)
		client_ids = append(client_ids, *req.ClientId)
		if req.Patches[i].ClientId == nil {
			return nil, status.Errorf(codes.InvalidArgument, fmt.Sprintf("producer_client_id is nil for patch %d", i))
		}
		producer_client_ids = append(producer_client_ids, *req.Patches[i].ClientId)
		if req.Patches[i].SessionId == nil {
			return nil, status.Errorf(codes.InvalidArgument, fmt.Sprintf("producer_session_id is nil for patch %d", i))
		}
		producer_session_ids = append(producer_session_ids, *req.Patches[i].SessionId)
		if req.Patches[i].PatchId == nil {
			return nil, status.Errorf(codes.InvalidArgument, fmt.Sprintf("producer_patch_id is nil for patch %d", i))
		}
		producer_patch_ids = append(producer_patch_ids, *req.Patches[i].PatchId)
	}
	err = qtx.DeletePendingPatches(ctx, &dbpkg.DeletePendingPatchesParams{UserIds: user_ids, ClientIds: client_ids, ProducerClientIds: producer_client_ids, ProducerSessionIds: producer_session_ids, ProducerPatchIds: producer_patch_ids})
	if err != nil {
		return nil, err
	}
	tx.Commit(ctx)
	return &api_v1_grpc.DeletePendingPatchesResp{}, nil
}

func (s *apiServer) CreatePatches(ctx context.Context, req *api_v1_grpc.CreatePatchesReq) (*api_v1_grpc.CreatePatchesResp, error) {
	token, err := get_token(ctx)
	if err != nil {
		return nil, err
	}
	return withTx(s, ctx, func(qtx *dbpkg.Queries) (*api_v1_grpc.CreatePatchesResp, error) {
		n := len(req.Patches)
		user_ids := make([]string, 0, n)
		client_ids := make([]int64, 0, n)
		session_ids := make([]int64, 0, n)
		patch_ids := make([]int64, 0, n)
		parent_client_ids := make([]int64, 0, n)
		parent_session_ids := make([]int64, 0, n)
		parent_patch_ids := make([]int64, 0, n)
		patches := make([][]byte, 0, n)
		created_ats := make([]pgtype.Timestamptz, 0, n)
		for i := range req.Patches {
			user_ids = append(user_ids, *token.UserId)
			if req.Patches[i].ClientId == nil {
				return nil, status.Errorf(codes.InvalidArgument, fmt.Sprintf("client_id is nil for patch %d", i))
			}
			client_ids = append(client_ids, *req.Patches[i].ClientId)
			if req.Patches[i].SessionId == nil {
				return nil, status.Errorf(codes.InvalidArgument, fmt.Sprintf("session_id is nil for patch %d", i))
			}
			session_ids = append(session_ids, *req.Patches[i].SessionId)
			if req.Patches[i].PatchId == nil {
				return nil, status.Errorf(codes.InvalidArgument, fmt.Sprintf("patch_id is nil for patch %d", i))
			}
			patch_ids = append(patch_ids, *req.Patches[i].PatchId)
			if req.Patches[i].ParentClientId == nil {
				return nil, status.Errorf(codes.InvalidArgument, fmt.Sprintf("parent_client_id is nil for patch %d", i))
			}
			parent_client_ids = append(parent_client_ids, *req.Patches[i].ParentClientId)
			if req.Patches[i].ParentSessionId == nil {
				return nil, status.Errorf(codes.InvalidArgument, fmt.Sprintf("parent_session_id is nil for patch %d", i))
			}
			parent_session_ids = append(parent_session_ids, *req.Patches[i].ParentSessionId)
			if req.Patches[i].ParentPatchId == nil {
				return nil, status.Errorf(codes.InvalidArgument, fmt.Sprintf("parent_patch_id is nil for patch %d", i))
			}
			parent_patch_ids = append(parent_patch_ids, *req.Patches[i].ParentPatchId)
			if req.Patches[i].Patch == nil {
				return nil, status.Errorf(codes.InvalidArgument, fmt.Sprintf("patch is nil for patch %d", i))
			}
			patches = append(patches, []byte(*req.Patches[i].Patch))
			if req.Patches[i].CreatedAt == nil {
				return nil, status.Errorf(codes.InvalidArgument, fmt.Sprintf("created_at is nil for patch %d", i))
			}
			created_ats = append(created_ats, pgtype.Timestamptz{Time: req.Patches[i].CreatedAt.AsTime(), Valid: true})
		}
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
		return &api_v1_grpc.CreatePatchesResp{}, nil
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
	tx.Commit(ctx)
	return res, nil
}

func mini64(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}

func get_token(ctx context.Context) (*token, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Errorf(codes.Unauthenticated, "no metadata")
	}
	authorizations, ok := md["authorization"]
	if !ok {
		return nil, status.Errorf(codes.Unauthenticated, "no authorization metadata")
	}
	if len(authorizations) != 1 {
		return nil, status.Errorf(codes.Unauthenticated, "len(authorizations) != 0")
	}
	splitted := strings.Split(authorizations[0], "Bearer ")
	if len(splitted) != 2 {
		return nil, status.Errorf(codes.Unauthenticated, "invalid Bearer format")
	}
	b64 := strings.TrimSpace(splitted[1])
	json_str, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "invalid base64")
	}
	// Parse json_str
	var token token
	err = json.Unmarshal(json_str, &token)
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "invalid json")
	}
	// Validate token
	if token.UserId == nil {
		return nil, status.Errorf(codes.Unauthenticated, "user_id is not set")
	}
	return &token, nil
}

func run() error {
	idgen := idgens.NewSortableIdGenerator(0)

	ctx := context.Background()
	conn_string, defined := os.LookupEnv("MY_DB_URI")
	if !defined {
		return fmt.Errorf("Environment variable `MY_DB_URI` not defined")
	}
	db, err := pgxpool.New(ctx, conn_string)
	if err != nil {
		return err
	}
	defer db.Close()

	queries := dbpkg.New(db)

	s := grpc.NewServer()
	api_v1_grpc.RegisterApiServer(s, &apiServer{queries: queries, idgen: idgen, db: db})
	reflection.Register(s)

	listener, err := net.Listen("tcp", fmt.Sprintf(":%d", 50051))
	if err != nil {
		return err
	}
	go func() {
		if err := s.Serve(listener); err != nil {
			log.Fatal(err)
		}
	}()
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit
	s.GracefulStop()

	return nil
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
