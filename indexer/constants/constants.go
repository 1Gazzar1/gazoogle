package constants

// weight term frequnecy, it's not pure TF now
// this way if word is in the title it's more relevant than a word in <p>
var TagWeights = map[string]float32{
	"title":  5,
	"h1":     3,
	"h2":     2.5,
	"strong": 1.5,
	"b":      1.5,
	"p":      1,
	"li":     1,
}

const (
	IndexerQueue = "indexer.queue"
	Workers      = 5       // no of workers
	PageLimit    = 1000000 // we stop scraping if we reach this number
)
