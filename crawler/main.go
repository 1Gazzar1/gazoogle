package main

import (
	"fmt"
	"sync"
)

func main() {
	const startPage = "https://en.wikipedia.org/wiki/Ultrakill"
	const limit = 3
	cnf := config{
		mu:      &sync.Mutex{},
		pageSet: map[string]struct{}{},
		sem:     make(chan struct{}, limit),
		wg:      &sync.WaitGroup{},
	}
	fmt.Println("starting the crawler")

	cnf.wg.Add(1)
	go cnf.crawlPage(startPage)

	// just something to block
	cnf.wg.Wait()
}
