package util

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

var blockedDomains = map[string]struct{}{
	"google.com":               {},
	"www.google.com":           {},
	"bing.com":                 {},
	"duckduckgo.com":           {},
	"facebook.com":             {},
	"instagram.com":            {},
	"twitter.com":              {},
	"x.com":                    {},
	"tiktok.com":               {},
	"linkedin.com":             {},
	"donate.wikimedia.org":     {},
	"foundation.wikimedia.org": {},
	"www.wikidata.org":         {},
	"www.mediawiki.org":        {},
	"stats.wikimedia.org":      {},
	"commons.wikimedia.org":    {},
	"scholar.google.com":       {},

	// these are observed from a run
	"web.archive.org": {},
	"archive.org":     {},
	"addtoany.com":    {},
}
var bannedNamespaces = map[string]struct{}{
	"Talk":        {},
	"User":        {},
	"Wikipedia":   {},
	"File":        {},
	"MediaWiki":   {},
	"Template":    {},
	"Help":        {},
	"Category":    {},
	"Portal":      {},
	"Special":     {},
	"Main_Page":   {},
	"Entity_Page": {},
	// also observed from a run
	"Book":      {},
	"Draft":     {},
	"TimedText": {},
	"Module":    {},
}

type PageData struct {
	URL           string            `json:"URL"` // the normalized url of the page
	HTML          string            `json:"HTML"`
	Title         string            `json:"Title"`
	OutgoingLinks []string          `json:"OutgoingLinks"` // basically the urls inside a page
	ImageMap      map[string]string `json:"ImageMap"`      // a map where the key is the url and val is the 'alt' text
}

func BuildPageData(URL string) (pageData PageData, err error) {
	// URL is normalized anyways, so we just parse it to use ResolveRef inside other functions

	u, err := url.Parse(URL)
	if err != nil {
		return PageData{}, fmt.Errorf("failed to parse URL,url: %v,error: %v", URL, err)
	}
	HTML, err := getHTML(URL)
	if err != nil {
		return PageData{}, fmt.Errorf("Failed to fetch HTML, error: %w", err)
	}

	title, err := extractTitle(HTML)
	if err != nil {
		return PageData{}, fmt.Errorf("Failed to extract title from html, error: %v", err)
	}
	urls, err := extractURLs(HTML, u)
	if err != nil {
		return PageData{}, fmt.Errorf("Failed to extract urls from html, error: %v", err)
	}
	imgs, err := extractImages(HTML, u)
	if err != nil {
		return PageData{}, fmt.Errorf("Failed to extract images from html, error: %v", err)
	}

	return PageData{
		URL:           URL,
		Title:         title,
		HTML:          HTML,
		OutgoingLinks: urls,
		ImageMap:      imgs,
	}, nil
}

func extractURLs(HTML string, baseURL *url.URL) (OutgoingLinks []string, err error) {
	doc, err := getDoc(HTML)
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML %v", err)
	}
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		att, exists := s.Attr("href")

		if !exists {
			return
		}

		u, err := url.Parse(att)
		if err != nil {
			return
		}
		u = baseURL.ResolveReference(u)
		// only web pages
		// this ignore redirect like 'whatsapp:' or 'mailto:' or 'javascript:' things
		if u.Scheme != "http" && u.Scheme != "https" {
			return
		}

		// guard check to ignore some wiki sites
		hostAndPath := u.Host + u.Path
		if _, exists := blockedDomains[u.Hostname()]; exists {
			return
		}

		if strings.Contains(u.Host, "wikipedia") {
			// 1. Strictly enforce en.wikipedia.org/wiki/
			if !strings.HasPrefix(hostAndPath, "en.wikipedia.org/wiki/") {
				return
			}

			// 2. Extract the page title (everything after /wiki/)
			title := strings.TrimPrefix(hostAndPath, "en.wikipedia.org/wiki/")

			// 3. Check for banned namespaces (e.g., Category: or Talk:)
			parts := strings.SplitN(title, ":", 2)
			if len(parts) > 1 {
				if _, exists := bannedNamespaces[parts[0]]; exists {
					return
				}
			} else if _, exists := bannedNamespaces[title]; exists {
				// Catch the "Main_Page" edge case
				return
			}
		}

		norm, err := NormalizeURL(u.String())
		if err != nil {
			return
		}
		OutgoingLinks = append(OutgoingLinks, norm)
	})
	return OutgoingLinks, nil
}
func extractImages(HTML string, baseURL *url.URL) (ImageMap map[string]string, err error) {
	doc, err := getDoc(HTML)
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML %v", err)
	}
	ImageMap = make(map[string]string)
	doc.Find("img").Each(func(i int, s *goquery.Selection) {
		// if the img tag doesn't have both 'src' & 'alt' then return
		src, srcExists := s.Attr("src")
		altText, altExists := s.Attr("alt")
		if !(srcExists || altExists) || strings.TrimSpace(src) == "" || strings.TrimSpace(altText) == "" {
			return
		}
		u, err := url.Parse(src)
		if err != nil {
			return
		}

		u = baseURL.ResolveReference(u)

		norm, err := NormalizeURL(u.String())
		if err != nil {
			return
		}
		ImageMap[norm] = altText
	})
	return ImageMap, nil
}
func extractTitle(HTML string) (title string, err error) {
	doc, err := getDoc(HTML)
	if err != nil {
		return "", fmt.Errorf("failed to parse HTML %v", err)
	}
	title = doc.Find("title").Text()
	return title, nil
}

func getDoc(HTML string) (*goquery.Document, error) {
	reader := strings.NewReader(HTML)
	doc, err := goquery.NewDocumentFromReader(reader)
	if err != nil {
		return nil, err
	}
	return doc, nil
}
