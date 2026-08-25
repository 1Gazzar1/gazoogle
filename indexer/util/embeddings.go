package util

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// to get embeddings, i'll use a docker image to do that
// and i'll talk to it by just making post reqs

func Embed[T string | []string](input T) (interface{}, error) {
	EMBEDDING := GetSafeEnv("EMBEDDING_URL")
	if EMBEDDING == "" {
		return nil, fmt.Errorf("EMBEDDING_URL environment variable is empty or unset")
	}

	type EmbedRequest struct {
		Inputs T `json:"inputs"`
	}

	req := EmbedRequest{
		Inputs: input,
	}

	bodyBytes, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	// Safely trim trailing slash to avoid double-slash bug ("//embed")
	url := fmt.Sprintf("%s/embed", strings.TrimRight(EMBEDDING, "/"))

	resp, err := http.Post(
		url,
		"application/json",
		bytes.NewReader(bodyBytes),
	)

	if err != nil {
		return nil, fmt.Errorf("Failed to embed text: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("Failed to read body of embedding respose: %w", err)
	}

	// Check if HTTP request returned non-200 status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Embedding server status %d: %s", resp.StatusCode, string(respBody))
	}

	var o [][]float32

	err = json.Unmarshal(respBody, &o)
	if err != nil {
		return nil, fmt.Errorf("Failed to unmarshal embedding reponse: %w", err)
	}
	if len(o) == 1 {
		return o[0], nil
	} else {
		return o, nil
	}
}
