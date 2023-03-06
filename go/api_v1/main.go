package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"time"

	"github.com/jackc/pgx/v5"
	pgtype "github.com/jackc/pgx/v5/pgtype"
	pgxpool "github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

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

// 1. Create a new user.
// 2. Create a new seq for the user.
// 3. Create the system client for the user.
// 4. Create the initial patch for the user.
func createUser(ctx context.Context, qtx *dbpkg.Queries, req *api_v1_grpc.CreateUserReq) (*api_v1_grpc.CreateUserResp, error) {
	_, err := qtx.RawCreateUser(ctx, req.UserId)
	if err != nil {
		return nil, err
	}
	_, err = qtx.CreateSeq(ctx, req.UserId)
	if err != nil {
		return nil, err
	}
	_, err = createClient(ctx, qtx, req.UserId, 0, "System")
	if err != nil {
		return nil, err
	}
	user_ids := []string{req.UserId}
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

func createClient(ctx context.Context, qtx *dbpkg.Queries, user_id string, client_id int64, name string) (*api_v1_grpc.CreateClientResp, error) {
	var err error
	if client_id == -1 {
		client_id, err = qtx.LastSeqValue(ctx, &dbpkg.LastSeqValueParams{UserID: user_id, Delta: 1})
		if err != nil {
			return nil, err
		}
	}
	err = qtx.CreateClient(ctx, &dbpkg.CreateClientParams{UserID: user_id, ClientID: client_id, Name: name})
	if err != nil {
		return nil, err
	}
	return &api_v1_grpc.CreateClientResp{ClientId: client_id}, nil
}

func (s *apiServer) CreateUser(ctx context.Context, req *api_v1_grpc.CreateUserReq) (*api_v1_grpc.CreateUserResp, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	qtx := s.queries.WithTx(tx)
	res, err := createUser(ctx, qtx, req)
	if err != nil {
		return nil, err
	}
	tx.Commit(ctx)
	return res, nil
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
