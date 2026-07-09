package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGetHTML(t *testing.T) {
	tests := []struct {
		name           string
		serverResponse string
		statusCode     int
		expectedHTML   string
		hasError       bool
	}{
		{
			name:           "Successful HTML retrieval",
			serverResponse: `<!DOCTYPE html><html><body><h1>Hello World</h1></body></html>`,
			statusCode:     http.StatusOK,
			expectedHTML:   `<!DOCTYPE html><html><body><h1>Hello World</h1></body></html>`,
			hasError:       false,
		},
		{
			name:           "Server returns 404 Not Found",
			serverResponse: "Not Found",
			statusCode:     http.StatusNotFound,
			expectedHTML:   "",
			hasError:       true,
		},
		{
			name:           "Server returns 500 Internal Error",
			serverResponse: "Internal Server Error",
			statusCode:     http.StatusInternalServerError,
			expectedHTML:   "",
			hasError:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 1. Start a local mock HTTP server
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.statusCode)
				_, _ = w.Write([]byte(tt.serverResponse))
			}))
			defer server.Close() // Clean up the server when the test finishes

			// 2. Call the function using the mock server's local URL
			actual, err := getHTML(server.URL)

			// 3. Assertions
			if tt.hasError {
				if err == nil {
					t.Errorf("GetHTML() expected an error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("GetHTML() unexpected error: %v", err)
			}

			if actual != tt.expectedHTML {
				t.Errorf("GetHTML()\nexpected: %q\ngot:      %q", tt.expectedHTML, actual)
			}
		})
	}

	// Network error edge case (e.g., completely broken or unreachable URL)
	t.Run("Unreachable URL error", func(t *testing.T) {
		_, err := getHTML("http://invalid.local.url.that.does.not.exist")
		if err == nil {
			t.Error("Expected network error for unreachable URL, got nil")
		}
	})
}