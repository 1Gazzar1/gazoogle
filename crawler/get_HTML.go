package main

import (
	"fmt"
	"io"
	"net/http"
)

func getHTML(url string) (HTML string, err error) {
	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	if resp.StatusCode > 299 {
		return "", fmt.Errorf("page didn't return a 200 OK or similar")
	}

	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(bodyBytes), nil
}
