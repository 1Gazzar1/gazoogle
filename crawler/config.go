package main

import (
	"fmt"
	"log"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/1gazzar1/gazoogle/crawler/constants"
	"github.com/1gazzar1/gazoogle/crawler/db"
	"github.com/1gazzar1/gazoogle/crawler/util"
	"github.com/redis/go-redis/v9"
)

type config struct {
	mu              *sync.Mutex
	wg              *sync.WaitGroup
	domainRatelimit map[string]time.Time // map containing all domain that we got 429 and last time we got 429
}

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

	// exists, err = db.ExistsInPageSet(URL)
	// if err != nil {
	// 	return true, err
	// }
	// if exists {
	// 	return true, nil
	// }
	// // if page doesn't exist, then claim it by adding it to the set first
	// // that way other goroutines would return early
	// err = db.AddPageToSet(URL)
	// if err != nil {
	// 	return true, err
	// }
	// return false, nil
	// ---- this approach was a race condition so i replaced with the following
	// we use the value return from addPageSet (0 or 1) to determine whether it was added or not
	// because only 1 command can be made at a time (redis is single threaded)
	claimed, err := db.AddPageToSet(URL)
	if err != nil {
		return true, err
	}

	return !claimed, nil // exists=true means someone else already has it
}
func unClaimPage(URL string) error {
	if err := db.DeleteKeyInPageSet(URL); err != nil {
		return fmt.Errorf("CRITICAL: failed to unclaim %v after failure, leaked: %w", URL, err)
	}
	err := db.AddPageToPriorityQueue(URL)
	if err != nil {
		return fmt.Errorf("Failed to add page while crawling: %w", err)
	}
	return nil
}
func (cnf *config) worker() {
	defer cnf.wg.Done()
	for {
		// Checking if the limit is reached before each time we scrape a new page
		n, err := db.GetSetLen()
		if err != nil {
			log.Printf("error checking set len: %v", err)
			continue
		}
		if n >= constants.PageLimit {
			log.Printf("Worker Finished Crawling %v (limit) Pages", constants.PageLimit)
			return
		}
		// if the indexer queue is over a certain number then pause the goroutine for a sec so it catches up
		idxLen, err := db.GetIndexerQueueLen()
		if err != nil {
			log.Printf("error checking indexer queue len: %v", err)
			continue
		}
		if idxLen >= constants.IndexerQueueLimit {
			log.Printf("Worker waiting for indexer to catch up, current indexer queue size: %v", idxLen)
			time.Sleep(1 * time.Second)
			continue
		}

		// finally crawl a page
		cnf.crawlOnePage("", true)
	}
}
func (cnf *config) crawlOnePage(URL string, internal bool) {
	// cnf.sem <- struct{}{}

	// defer func() {
	// 	<-cnf.sem
	// 	cnf.wg.Done()
	// 	// cnf.wg.Add(1)
	// 	go cnf.crawlPage("", true)
	// }()
	// so i can use = instead of := and handle scope correctly
	var err error
	start := time.Now()
	defer func() {
		cnf.writeMetric(fmt.Sprintf("Scraped %v Successfully!", URL), int(time.Since(start).Milliseconds()), err)
	}()
	// this part should be moved up in scope but i'm lazy :V
	if internal {
		URL, err = db.PopPageFromPriorityQueue()
		if err == redis.Nil {
			// if the queue is empty pause the goroutine for a second
			log.Printf("Priority Queue is Empty, waiting...")
			time.Sleep(1 * time.Second)
			// return so it loops and tries again
			return
		}
		if err != nil {
			log.Printf("error while fetching next url, error: %v", err)
			return
		}

		var u *url.URL
		u, err = url.Parse(URL) //
		if err != nil {
			if reErr := db.AddPageToPriorityQueue(URL); reErr != nil {
				log.Printf("Failed to requeue after parse failure: %v", reErr)
			}
			return
		}
		if timestamp, exists := cnf.domainRatelimit[u.Hostname()]; exists &&
			time.Since(timestamp) < constants.RateLimitWaitTime {
			err = fmt.Errorf("INFO: Skipping URL: %v, to avoid being ratelimited", URL)
			// add it back to the queue
			db.AddPageToPriorityQueue(URL)
			time.Sleep(1 * time.Second) // wait a sec then return, this is so we don't pop and requeue a wiki page 100 times
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
	// if we get 429 then add it to the map
	if err != nil {
		if strings.Contains(err.Error(), "status code: 429") {
			u, err := url.Parse(URL)
			if err != nil {
				return
			}
			cnf.domainRatelimit[u.Hostname()] = time.Now()
		}
		fmt.Printf("Failed to build page with url: %v, error: %v", URL, err)
		unClaimPage(URL)
		return
	}
	// pass the pageData to redis here
	err = db.AddPageToIndexerQueue(pageData)
	if err != nil {
		unClaimPage(URL)
		log.Printf("error while crawling: %v", err)
		return
	}

	no, err := db.GetSetLen()
	if err != nil {
		//skip
		unClaimPage(URL)
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

		l, err := db.GetPriorityQueueLen()
		if err != nil {
			continue
		}
		// if the queue is larger than the acutal limit then just don't add, we'll proabably not reach it anyways
		if l >= constants.PageLimit {
			continue
		}
		// add to redis priority queue
		err = db.AddPageToPriorityQueue(normURL)
		if err != nil {
			log.Printf("Failed to add page while crawling: %v", err)
			continue
		}
	}
}
