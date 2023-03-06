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
	UserId string `json:"user_id"`
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
		CreatedAt:        []pgtype.Timestamptz{{Time: time.Now(), Valid: true}},
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
	res, err := createClient(ctx, qtx, token.UserId, -1, req.Name)
	if err != nil {
		return nil, err
	}
	tx.Commit(ctx)
	return res, nil
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
