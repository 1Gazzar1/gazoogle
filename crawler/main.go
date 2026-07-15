package main

import (
	"fmt"
	"sync"

	"github.com/1gazzar1/gazoogle/crawler/db"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	const startPage = "https://en.wikipedia.org/wiki/Ultrakill"
	const limit = 3

	db.InitRedis()

	cnf := config{
		mu:      &sync.Mutex{},
		pageSet: map[string]struct{}{},
		sem:     make(chan struct{}, limit),
		wg:      &sync.WaitGroup{},
	}
	fmt.Println("starting the crawler")

	cnf.wg.Add(1)
	go cnf.crawlPage(startPage)

	cnf.wg.Wait()
}
