package main

import (
	"fmt"

	"github.com/1gazzar1/gazoogle/crawler/db"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	const startPage = "https://en.wikipedia.org/wiki/Ultrakill"
	const workers = 1

	db.InitRedis()

	fmt.Println("starting the crawler")

	for range workers {
		go worker()
	}
	db.AddPageToPriorityQueue(startPage)

	// just something to block
	ch := make(chan struct{})
	ch <- struct{}{}
}
