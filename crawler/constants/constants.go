package constants

import "time"

const (
	// these are just names for the redis lists/sets
	PriorityQueue = "priority.queue"
	PageSet       = "pages"
	IndexerQueue  = "indexer.queue"
	// ------------------------------------------
	StartPage         = "https://en.wikipedia.org/wiki/Ultrakill" // first page we scrape
	Workers           = 10                                        // no of workers
	IndexerQueueLimit = 5000                                      // meaning if the queue is bigger than 100 in size we slow scrapping down
	PageLimit         = 100000                                    // we stop scraping if we reach this number
	RateLimitWaitTime = time.Second * 30                          // time we wait before scraping a page again if we get 429 from its domain

	MetricsFilePath = "./metrics.jsonl"
)
