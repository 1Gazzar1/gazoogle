package main

import (
	"fmt"
	"log"
	"os"
	"sync"

	"github.com/1gazzar1/gazoogle/crawler/constants"
	"github.com/1gazzar1/gazoogle/crawler/db"
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
	DB_URL := GetSafeEnv("REDIS_DB")
	cnf := config{
		mu: &sync.Mutex{},
		wg: &sync.WaitGroup{},
	}
	db.InitRedis(DB_URL)

	fmt.Println("starting the crawler")

	for range constants.Workers {
		cnf.wg.Add(1)
		go cnf.worker(constants.PageLimit)
	}
	db.AddPageToPriorityQueue(constants.StartPage)

	cnf.wg.Wait()

}
