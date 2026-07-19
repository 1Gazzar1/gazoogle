package main

import (
	"fmt"
	"sync"

	"github.com/1gazzar1/gazoogle/crawler/constants"
	"github.com/1gazzar1/gazoogle/crawler/db"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	wg := &sync.WaitGroup{}

	db.InitRedis()

	fmt.Println("starting the crawler")

	for range constants.Workers {
		wg.Add(1)
		go worker(wg, constants.PageLimit)
	}
	db.AddPageToPriorityQueue(constants.StartPage)

	wg.Wait()

}
