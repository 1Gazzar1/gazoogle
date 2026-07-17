package main

import (
	"fmt"
	"log"
	"time"

	"github.com/1gazzar1/gazoogle/crawler/db"
	"github.com/1gazzar1/gazoogle/crawler/util"
	"github.com/redis/go-redis/v9"
)

// redis handles all that so that's not necassary

// func (cnf *config) ifPageNotExistThenAdd(URL string) (exists bool, currentLenght int) {
// 	cnf.mu.Lock()
// 	defer cnf.mu.Unlock()

//		if _, exists := cnf.pageSet[URL]; !exists {
//			cnf.pageSet[URL] = struct{}{}
//			return false, len(cnf.pageSet)
//		}
//		return true, len(cnf.pageSet)
//	}
func claimPage(URL string) (exists bool, err error) {
	exists, err = db.ExistsInPageSet(URL)
	if err != nil {
		return true, err
	}
	if exists {
		return true, nil
	}
	// if page doesn't exist, then claim it by adding it to the set first
	// that way other goroutines would return early
	err = db.AddPageToSet(URL)
	if err != nil {
		return true, err
	}
	return false, nil

}
func worker() {
	for {
		crawlOnePage("", true)
	}
}
func crawlOnePage(URL string, internal bool) {
	// cnf.sem <- struct{}{}

	// defer func() {
	// 	<-cnf.sem
	// 	cnf.wg.Done()
	// 	// cnf.wg.Add(1)
	// 	go cnf.crawlPage("", true)
	// }()
	// so i can use = instead of := and handle scope correctly
	var err error
	if internal {
		URL, err = db.PopPageFromPriorityQueue()
		if err == redis.Nil {
			// if the queue is empty
			time.Sleep(1 * time.Second)
			// return so it loops and tries again
			return
		}
		if err != nil {
			log.Printf("error while fetching next url, error: %v", err)
			return
		}
	}
	// exists, no := cnf.ifPageNotExistThenAdd(URL)
	exists, err := claimPage(URL)
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
		if exists, _ := db.ExistsInPageSet(normURL); exists {
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

}
