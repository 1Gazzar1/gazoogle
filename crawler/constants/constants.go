package constants

const (
	// these are just names for the redis lists/sets
	PriorityQueue = "priority.queue"
	PageSet       = "pages"
	IndexerQueue  = "indexer.queue"
	// ------------------------------------------
	StartPage         = "https://en.wikipedia.org/wiki/Ultrakill" // first page we scrape
	Workers           = 10                                        // no of workers
	IndexerQueueLimit = 100                                       // meaning if the queue is bigger than 100 in size we slow scrapping down
	PageLimit         = 1000000                                   // we stop scraping if we reach this number
)
