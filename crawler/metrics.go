package main

import (
	"encoding/json"
	"log"
	"strings"
	"time"
)

type MetricType string

const (
	Success MetricType = "SUCCESS"
	Error   MetricType = "ERROR"
	Info    MetricType = "INFO"
)

type metric struct {
	MetricType MetricType `json:"metricType"`
	Timestamp  string     `json:"timestamp"`
	Text       string     `json:"text"`
	DurationMS int        `json:"duration_ms"`
}

func makeMetric(text string, durationMs int, incomingErr error) metric {
	var mType MetricType = Success
	var mText string = text

	if incomingErr != nil {
		mType = Error
		mText = incomingErr.Error()
	}
	if incomingErr != nil && strings.Contains(incomingErr.Error(), "INFO") {
		mType = Info
	}
	return metric{
		MetricType: mType,
		Text:       mText,
		Timestamp:  time.Now().String(),
		DurationMS: durationMs,
	}
}

func (cnf *config) writeMetric(text string, durationMs int, incomingErr error) {
	cnf.mu.Lock()
	defer cnf.mu.Unlock()

	m := makeMetric(text, durationMs, incomingErr)

	data, err := json.Marshal(m)
	if err != nil {
		log.Printf("CRITICAL: Failed to marshal metric struct err: %v", err)
		return
	}

	if err = json.NewEncoder(cnf.metricsFile).Encode(data); err != nil {
		log.Printf("CRITICAL: Failed to write to metrics file err: %v", err)
		return
	}
}
