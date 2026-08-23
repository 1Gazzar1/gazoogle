package main

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log"
	"os"
	"sync"
	"time"
)

const filePath = "./metrics.json"

var mu = &sync.Mutex{}

type MetricType string

const (
	Success MetricType = "SUCCESS"
	Error   MetricType = "ERROR"
)

type metric struct {
	MetricType MetricType `json:"metricType"`
	Timestamp  string     `json:"timestamp"`
	Text       string     `json:"text"`
	DurationMS int        `json:"duration_ms"`
}

func writeMetric(text string, durationMs int, incomingErr error) {
	mu.Lock()
	defer mu.Unlock()

	metrics := make([]metric, 0)
	metricsData, err := os.ReadFile(filePath)

	// for first time writing a metric
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		log.Printf("CRITICAL: Failed to read metrics file err: %v", err)
		return
	}
	// this condition avoids first time making the file
	if string(metricsData) == "" {
		metricsData = []byte("[]")
	}
	err = json.Unmarshal(metricsData, &metrics)

	if err != nil {
		log.Printf("CRITICAL: Failed to unmarshal metrics file err: %v", err)
		return
	}

	var mType MetricType = Success
	var mText string = text
	if incomingErr != nil {
		mType = Error
		mText = incomingErr.Error()
	}
	m := metric{
		MetricType: mType,
		Text:       mText,
		Timestamp:  time.Now().String(),
		DurationMS: durationMs,
	}
	metrics = append(metrics, m)

	d, err := json.Marshal(metrics)
	if err != nil {
		log.Printf("CRITICAL: Failed to marshal metrics file err: %v", err)
		return
	}
	err = os.WriteFile(filePath, d, 0644)
	if err != nil {
		log.Printf("CRITICAL: Failed to write metrics file err: %v", err)
		return
	}
}
