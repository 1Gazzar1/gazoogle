package util

import (
	"log"
	"os"
)

func GetSafeEnv(env string) string {
	val := os.Getenv(env)
	if val == "" {
		log.Fatal("Failed to load env var with name: %v", env)
	}
	return val
}
