package main

import (
	"context"
	"log"
	"os"
	"sync"

	"github.com/1gazzar1/gazoogle/indexer/constants"
	"github.com/1gazzar1/gazoogle/indexer/db"
	"github.com/1gazzar1/gazoogle/indexer/internal"
	_ "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
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

	db.InitRedis(REDIS)

	ctx := context.Background()
	conn, err := pgxpool.New(ctx, POSTGRES)
	if err != nil {
		log.Fatalf("failed to connect to postgres: %v", err)
	}
	schema, err := os.ReadFile("./db/schema.sql")
	if err != nil {
		log.Fatalf("Failed to load the db schema")
	}
	_, err = conn.Exec(ctx, string(schema))
	if err != nil {
		log.Fatalf("Failed to init postgres, err: %v", err)
	}
	wg := &sync.WaitGroup{}
	queries := internal.New(conn)

	for range constants.Workers {
		wg.Add(1)
		go worker(wg, conn, queries, ctx)
	}
	wg.Wait()

}
