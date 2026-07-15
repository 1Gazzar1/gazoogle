package main

import (
	"fmt"
	"sync"

	"github.com/1gazzar1/gazoogle/crawler/util"
)

type config struct {
	mu      *sync.Mutex
	pageSet map[string]struct{}
	sem     chan struct{}
	wg      *sync.WaitGroup
}

func (cnf *config) ifPageNotExistThenAdd(URL string) (exists bool, currentLenght int) {
	cnf.mu.Lock()
	defer cnf.mu.Unlock()

	if _, exists := cnf.pageSet[URL]; !exists {
		cnf.pageSet[URL] = struct{}{}
		return false, len(cnf.pageSet)
	}
	return true, len(cnf.pageSet)
}

// TODO: I should make it so redis holds a list of the next pages that should be scraped
// so that way it works if there's multiple crawlers
// and add a set for already scraped pages with redis too
func (cnf *config) crawlPage(URL string) {
	// semaphore patten, so each goroutines holds one spot
	cnf.sem <- struct{}{}

	defer func() {
		<-cnf.sem
		cnf.wg.Done()
	}()
	exists, no := cnf.ifPageNotExistThenAdd(URL)
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
	fmt.Println("\n+++++++++++++++++++++++++++++++++++++++++++")
	fmt.Printf("%v- Scraped page: %v, it has %v forward links\n", no, pageData.Title, len(pageData.OutgoingLinks))

	for _, url := range pageData.OutgoingLinks {
		// normalize url first then add it to the channel so other workers recieve it
		normURL, err := util.NormalizeURL(url)
		if err != nil {
			fmt.Printf("failed to normalize url: %v, error: %v", url, err)
			// skip the url, don't return
			continue
		}
		cnf.wg.Add(1)
		go cnf.crawlPage(normURL)
	}

}
