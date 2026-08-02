package util

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// to get embeddings, i'll use a docker image to do that
// and i'll talk to it by just making post reqs

func Embed(text string) ([]float32, error) {
	type EmbedRequest struct {
		Inputs string `json:"inputs"`
	}

	req := EmbedRequest{
		Inputs: text,
	}

	bodyBytes, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	resp, err := http.Post(
		"http://localhost:1234/embed",
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

	var o [][]float32

	err = json.Unmarshal(respBody, &o)
	if err != nil {
		return nil, fmt.Errorf("Failed to unmarshal embedding reponse: %w", err)
	}

	return o[0], nil
}
