package db

import (
	"context"
	"log"

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
