package main

import (
	"context"
	"log"
	"os"
	"sync"
	"time"

	_ "embed"

	"github.com/1gazzar1/gazoogle/indexer/constants"
	"github.com/1gazzar1/gazoogle/indexer/db"
	"github.com/1gazzar1/gazoogle/indexer/internal"
	"github.com/1gazzar1/gazoogle/indexer/util"
	"github.com/jackc/pgx/v5"
	_ "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	pgvex "github.com/pgvector/pgvector-go/pgx"
)

// this is a cool feature where you can embed a file into a variable
//
//go:embed db/schema.sql
var schema string

type config struct {
	ctx          context.Context
	queries      *internal.Queries
	pool         *pgxpool.Pool
	wg           *sync.WaitGroup
	termsCh      chan termsChInput
	blankPagesCh chan blankPagesChInput
	mu           *sync.Mutex
	metricsFile  *os.File
}

func main() {
	godotenv.Load()

	REDIS := util.GetSafeEnv("REDIS_DB")
	POSTGRES := util.GetSafeEnv("POSTGRES_DB")

	file, err := os.OpenFile(constants.MetricsFilePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("CRITICAL: Failed to read metrics file err: %v", err)
		return
	}
	defer file.Close()

	cnf := config{
		ctx:          context.Background(),
		wg:           &sync.WaitGroup{},
		termsCh:      make(chan termsChInput),
		blankPagesCh: make(chan blankPagesChInput),
		mu:           &sync.Mutex{},
		metricsFile:  file,
	}

	db.InitRedis(REDIS)
	initDatabaseSchema(POSTGRES, cnf.ctx)

	cnf.pool = connectToPg(POSTGRES, cnf.ctx)
	defer cnf.pool.Close()

	cnf.queries = internal.New(cnf.pool)

	const duration = 500 * time.Millisecond
	// these are considered as seperate workers
	// the actual workers send them values through the channels
	// they collect data and handle them all in one place to avoid deadlocks
	// this is because the upsertings 'terms' and 'createBlankPages' cause deadlocks via locking rows
	go fanInWriter(&cnf, duration, cnf.termsCh, cnf.handleTerms)
	go fanInWriter(&cnf, duration, cnf.blankPagesCh, cnf.handleBlankPages)

	for range constants.Workers {
		cnf.wg.Add(1)
		go cnf.worker()
	}
	cnf.wg.Wait()

}
func initDatabaseSchema(connectionString string, ctx context.Context) {
	conn, err := pgx.Connect(ctx, connectionString)
	if err != nil {
		log.Fatalf("failed to open initial postgres connection: %v", err)
	}
	defer conn.Close(ctx)

	log.Println("Initializing database schema...")
	if _, err := conn.Exec(ctx, schema); err != nil {
		log.Fatalf("Failed to init postgres schema, err: %v", err)
	}
	log.Println("Database schema initialized successfully.")
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
