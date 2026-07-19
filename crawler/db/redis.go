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
var Ctx context.Context = context.Background()

func InitRedis() {
	DB_URL := util.GetSafeEnv("REDIS_DB")
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

func AddPageToPriorityQueue(normURL string) error {
	// FIFO queue
	_, err := DB.LPush(Ctx, constants.PriorityQueue, normURL).Result()
	if err != nil {
		return fmt.Errorf("failed to push url to priority queue: %v", err)
	}
	// fmt.Printf("Pushed %v to priority queue\n", normURL)
	return nil
}
func PopPageFromPriorityQueue() (url string, err error) {
	url, err = DB.RPop(Ctx, constants.PriorityQueue).Result()

	if err != nil {
		return "", err
	}
	fmt.Printf("Poped %v from priority queue\n", url)
	return url, nil
}

func GetPriorityQueueLen() (int, error) {
	val, err := DB.LLen(Ctx, constants.PriorityQueue).Result()

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
	_, err = DB.LPush(Ctx, constants.IndexerQueue, string(pageDataBytes)).Result()
	if err != nil {
		return fmt.Errorf("Failed to push pageData to Indexer queue, error: %v", err)
	}
	fmt.Printf("Pushed %v to indexer queue\n", pageData.URL)
	return nil
}
func GetIndexerQueueLen() (int, error) {
	val, err := DB.LLen(Ctx, constants.IndexerQueue).Result()

	if err != nil {
		return 0, fmt.Errorf("failed to get len of queue")
	}
	return int(val), nil
}
func AddPageToSet(normURL string) error {
	_, err := DB.SAdd(Ctx, constants.PageSet, normURL).Result()

	if err != nil {
		return fmt.Errorf("failed to add page to set, error: %v", err)
	}
	return nil
}
func GetSetLen() (int, error) {
	size, err := DB.SCard(Ctx, constants.PageSet).Result()

	if err != nil {
		return 0, fmt.Errorf("failed to get set len, error: %v", err)
	}
	return int(size), nil
}
func ExistsInPageSet(normURL string) (bool, error) {
	exists, err := DB.SIsMember(Ctx, constants.PageSet, normURL).Result()
	// this is a thing apparently when there's no key
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to get set len, error: %v", err)
	}
	return exists, nil
}
func DeleteKeyInPageSet(normUrl string) error {
	deleted, err := DB.SRem(Ctx, constants.PageSet, normUrl).Result()
	if err != nil {
		return fmt.Errorf("failed to get delete set key, error: %v", err)
	}
	if deleted != 1 {
		return fmt.Errorf("failed to get delete set key, error: %v", err)
	}
	return nil
}
