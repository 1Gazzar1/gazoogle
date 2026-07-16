package db

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/1gazzar1/gazoogle/crawler/constants"
	"github.com/1gazzar1/gazoogle/crawler/util"
	"github.com/redis/go-redis/v9"
)

var DB *redis.Client
var ctx context.Context = context.Background()

func InitRedis() {
	DB_URL := util.GetSafeEnv("REDIS_DB")
	DB = redis.NewClient(&redis.Options{
		Addr:     DB_URL,
		Password: "",
		DB:       0,
	})

	_, err := DB.Ping(ctx).Result()

	if err != nil {
		log.Fatalf("couldn't connect to redis, err: %v", err)
	}
	log.Println("connected to redis succesfully")
}

func AddPageToPriorityQueue(normURL string) error {
	// FIFO queue
	_, err := DB.LPush(ctx, constants.PriorityQueue, normURL).Result()
	if err != nil {
		return fmt.Errorf("failed to push url to priority queue: %v", err)
	}
	fmt.Printf("Pushed %v to priority queue\n", normURL)
	return nil
}
func PopPageFromPriorityQueue() (url string, err error) {
	url, err = DB.RPop(ctx, constants.PriorityQueue).Result()
	if err != nil {
		return "", fmt.Errorf("failed to pop url to priority queue: %v", err)
	}
	fmt.Printf("Poped %v from priority queue\n", url)
	return url, nil
}

func GetPriorityQueueLen() (int, error) {
	val, err := DB.LLen(ctx, constants.PriorityQueue).Result()

	if err != nil {
		return 0, fmt.Errorf("failed to get len of queue")
	}
	return int(val), nil
}
func AddPageToIndexerQueue(pageData util.PageData) error {
	// FIFO queue

	// first we json.marshal the pageData so redis can store it as a string
	pageDataBytes, err := json.Marshal(pageData)
	if err != nil {
		return fmt.Errorf("Failed to marshal pageData, error: %v", err)
	}
	_, err = DB.LPush(ctx, constants.IndexerQueue, string(pageDataBytes)).Result()
	if err != nil {
		return fmt.Errorf("Failed to push pageData to Indexer queue, error: %v", err)
	}
	fmt.Printf("Pushed %v to indexer queue\n", pageData.URL)
	return nil
}
func GetIndexerQueueLen() (int, error) {
	val, err := DB.LLen(ctx, constants.IndexerQueue).Result()

	if err != nil {
		return 0, fmt.Errorf("failed to get len of queue")
	}
	return int(val), nil
}
func AddPageToSet(normURL string) error {
	_, err := DB.SAdd(ctx, constants.PageSet, normURL).Result()

	if err != nil {
		return fmt.Errorf("failed to add page to set, error: %v", err)
	}
	return nil
}
func GetSetLen() (int, error) {
	size, err := DB.SCard(ctx, constants.PageSet).Result()

	if err != nil {
		return 0, fmt.Errorf("failed to get set len, error: %v", err)
	}
	return int(size), nil
}
func ExistsInPageSet(normURL string) (bool, error) {
	exists, err := DB.SIsMember(ctx, constants.PageSet, normURL).Result()
	// this is a thing apparently when there's no key
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to get set len, error: %v", err)
	}
	return exists, nil
}
