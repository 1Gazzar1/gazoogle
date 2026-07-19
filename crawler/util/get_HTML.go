package util

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

func getHTML(url string) (HTML string, err error) {

	client := &http.Client{
		Timeout: 15 * time.Second,
	}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to build request,error %v", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}

	defer resp.Body.Close()

	if resp.StatusCode > 299 {
		return "", fmt.Errorf("page didn't return a 200 OK or similar, status code: %v, error : %v", resp.StatusCode, err)
	}
	if cType := resp.Header.Get("Content-Type"); !strings.Contains(cType, "text/html") {

		return "", fmt.Errorf("invalid page content type %v", cType)

	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(bodyBytes), nil
}
