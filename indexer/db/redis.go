package db

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

var DB *redis.Client
var Ctx context.Context = context.Background()

type PageData struct {
	URL           string            `json:"URL"` // the normalized url of the page
	HTML          string            `json:"HTML"`
	Title         string            `json:"Title"`
	OutgoingLinks []string          `json:"OutgoingLinks"` // basically the urls inside a page
	ImageMap     map[string]string `json:"ImageMap"`     // a map where the key is the url and val is the 'alt' text
}

func InitRedis(DB_URL string) {
	DB = redis.NewClient(&redis.Options{
		Addr:     DB_URL,
		Password: "",
		DB:       0,
	})

	_, err := DB.Ping(Ctx).Result()

	if err != nil {
		log.Fatalf("couldn't connect to redis, err: %v", err)
	}
	log.Println("connected to redis succesfully")
}

const IndexerQueue = "indexer.queue"

func GetNextPageData() (pageData PageData, err error) {
	pageDataItem, err := DB.RPop(Ctx, IndexerQueue).Result()
	if err != nil {
		return PageData{}, fmt.Errorf("Failed to retreive pageData from redis: %v", err)
	}

	err = json.Unmarshal([]byte(pageDataItem), &pageData)
	if err != nil {

		return PageData{}, fmt.Errorf("Failed to unmarshal object to pageData: %v", err)
	}
	return pageData, nil
}
