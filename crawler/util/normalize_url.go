package util

import (
	"net/url"
	"strings"
)

func NormalizeURL(URL string) (normURL string, err error) {
	// fun fact
	// in internet urls, the domain part is case insensitive,
	// but that path and query are case sensitive

	parsed, err := url.Parse(URL)
	if err != nil {
		return "", err
	}
	parsed.Host = strings.ToLower(parsed.Host)
	parsed.Scheme = strings.ToLower(parsed.Scheme)

	// if the default port was there, remove it
	if (parsed.Scheme == "http" && parsed.Port() == "80") ||
		(parsed.Scheme == "https" && parsed.Port() == "443") {

		parsed.Host = parsed.Hostname()
	}
	// remove trailing slashes
	parsed.Path, _ = strings.CutSuffix(parsed.Path, "/")

	// remove fragments (like #header)
	parsed.Fragment = ""
	parsed.RawFragment = ""

	// remove the query too
	parsed.RawQuery = ""
	return parsed.String(), nil
}
