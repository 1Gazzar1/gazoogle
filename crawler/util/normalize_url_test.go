package util

import (
	"testing"
)

func TestNormalizeURL(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
		hasError bool
	}{
		{
			name:     "Lowercase scheme and host",
			input:    "HTTPS://WWW.Example.COM/Path",
			expected: "https://www.example.com/Path",
		},
		{
			name:     "Remove default port 80",
			input:    "http://example.com:80/home",
			expected: "http://example.com/home",
		},
		{
			name:     "Remove default port 443",
			input:    "https://example.com:443/home",
			expected: "https://example.com/home",
		},
		{
			name:     "Keep non-default port",
			input:    "https://example.com:8080/home",
			expected: "https://example.com:8080/home",
		},
		{
			name:     "Trailing slash removal on root",
			input:    "https://example.com/",
			expected: "https://example.com",
		},
		{
			name:     "Remove tracking and extra query params (if applicable)",
			input:    "https://example.com/path?b=2&a=1",
			expected: "https://example.com/path",
		},
		{
			name:     "Handle empty path",
			input:    "https://example.com",
			expected: "https://example.com",
		},
		{
			name:     "Invalid URL error handling",
			input:    "://invalid-url",
			expected: "",
			hasError: true,
		},
		{
			name:     "Strip fragments/hash anchors",
			input:    "https://example.com/page?a=1#section-heading",
			expected: "https://example.com/page",
			hasError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual, err := NormalizeURL(tt.input)

			if tt.hasError {
				if err == nil {
					t.Errorf("NormalizeURL(%q) expected error, got nil", tt.input)
				}
				return
			}

			if err != nil {
				t.Fatalf("NormalizeURL(%q) unexpected error: %v", tt.input, err)
			}

			if actual != tt.expected {
				t.Errorf("NormalizeURL(%q)\nexpected: %q\ngot:      %q", tt.input, tt.expected, actual)
			}
		})
	}
}
