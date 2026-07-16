package main

import (
	"fmt"
	"log"
	"sync"

	"github.com/1gazzar1/gazoogle/crawler/db"
	"github.com/1gazzar1/gazoogle/crawler/util"
)

type config struct {
	mu  *sync.Mutex
	sem chan struct{}
	wg  *sync.WaitGroup
}

// redis handles all that so that's not necassary

// func (cnf *config) ifPageNotExistThenAdd(URL string) (exists bool, currentLenght int) {
// 	cnf.mu.Lock()
// 	defer cnf.mu.Unlock()

// 	if _, exists := cnf.pageSet[URL]; !exists {
// 		cnf.pageSet[URL] = struct{}{}
// 		return false, len(cnf.pageSet)
// 	}
// 	return true, len(cnf.pageSet)
// }

func (cnf *config) crawlPage(URL string, internal bool) {
	// semaphore patten, so each goroutines holds one spot
	cnf.sem <- struct{}{}

	defer func() {
		<-cnf.sem
		// cnf.wg.Done()
	}()
	// so i can use = instead of := and handle scope correctly
	var err error
	if internal {
		URL, err = db.PopPageFromPriorityQueue()
		if err != nil {
			log.Printf("error while fetching next url, error: %v", err)
			return
		}
	}
	// exists, no := cnf.ifPageNotExistThenAdd(URL)
	exists, err := db.ExistsInPageSet(URL)
	if err != nil {
		//skip
		log.Printf("error while crawling: %v", err)
		return
	}
	if exists {
		// if the page exists return
		return
	}

	pageData, err := util.BuildPageData(URL)
	if err != nil {
		fmt.Printf("Failed to build page with url: %v, error: %v", URL, err)
		return
	}
	// pass the pageData to redis here
	err = db.AddPageToIndexerQueue(pageData)
	if err != nil {
		log.Printf("error while crawling: %v", err)
		return
	}
	// then add it to the page set
	err = db.AddPageToSet(URL)
	if err != nil {
		log.Printf("error while crawling: %v", err)
		return
	}
	no, err := db.GetSetLen()
	if err != nil {
		//skip
		log.Printf("error while crawling: %v", err)
		return
	}
	fmt.Println("\n+++++++++++++++++++++++++++++++++++++++++++")
	fmt.Printf("%v- Scraped page: %v, it has %v forward links\n", no, pageData.Title, len(pageData.OutgoingLinks))

	for _, url := range pageData.OutgoingLinks {
		// normalize url first, so it's normalized everywhere else
		normURL, err := util.NormalizeURL(url)
		if err != nil {
			log.Printf("failed to normalize url: %v, error: %v", url, err)
			// skip the url, don't return
			continue
		}
		if exists, _ := db.ExistsInPageSet(url); exists {
			continue
		}
		// add to redis priority queue
		err = db.AddPageToPriorityQueue(normURL)
		if err != nil {
			log.Printf("Failed to add page while crawling: %v", err)
			continue
		}

	}
	// this way it recursively scrapes the whole internet
	cnf.wg.Add(1)
	go cnf.crawlPage("", true)

}
