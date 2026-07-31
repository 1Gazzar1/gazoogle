package main

import (
	"context"
	"log"
	"os"
	"sync"

	"github.com/1gazzar1/gazoogle/indexer/constants"
	"github.com/1gazzar1/gazoogle/indexer/db"
	"github.com/1gazzar1/gazoogle/indexer/internal"
	"github.com/jackc/pgx/v5"
	_ "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	pgvex "github.com/pgvector/pgvector-go/pgx"
)

func GetSafeEnv(env string) string {
	val := os.Getenv(env)
	if val == "" {
		log.Fatalf("Failed to load env var with name: %v", env)
	}
	return val
}

func main() {
	godotenv.Load()

	REDIS := GetSafeEnv("REDIS_DB")
	POSTGRES := GetSafeEnv("POSTGRES_DB")

	ctx := context.Background()

	db.InitRedis(REDIS)
	pool := connectToPg(POSTGRES, ctx)

	schema, err := os.ReadFile("./db/schema.sql")
	if err != nil {
		log.Fatalf("Failed to load the db schema")
	}
	_, err = pool.Exec(ctx, string(schema))
	if err != nil {
		log.Fatalf("Failed to init postgres, err: %v", err)
	}
	wg := &sync.WaitGroup{}
	queries := internal.New(pool)

	for range constants.Workers {
		wg.Add(1)
		go worker(wg, pool, queries, ctx)
	}
	wg.Wait()

}

func connectToPg(connectionString string, ctx context.Context) *pgxpool.Pool {
	// this part means that everytime we make a new connection in the pool
	// we register the pgvector custom type (from the vector extension)
	// so postgres can use the right encodings
	config, err := pgxpool.ParseConfig(connectionString)
	if err != nil {
		log.Fatalf("failed to connect to postgres: %v", err)
	}
	config.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		return pgvex.RegisterTypes(ctx, conn)
	}
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Fatalf("failed to connect to postgres: %v", err)
	}
	log.Printf("Connected to Postgres succesfully.")
	return pool
}
