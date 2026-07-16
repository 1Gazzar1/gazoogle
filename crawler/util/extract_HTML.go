package util

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

type PageData struct {
	URL           string   `json:"URL"` // the normalized url of the page
	HTML          string   `json:"HTML"`
	Title         string   `json:"Title"`
	OutgoingLinks []string `json:"OutgoingLinks"` // basically the urls inside a page
	ImageURLs     []string `json:"ImageURLs"`
}

func BuildPageData(URL string) (pageData PageData, err error) {
	// URL is normalized anyways, so we just parse it to use ResolveRef inside other functions

	u, err := url.Parse(URL)
	if err != nil {
		return PageData{}, fmt.Errorf("failed to parse URL,url: %v,error: %v", URL, err)
	}
	HTML, err := getHTML(URL)
	if err != nil {
		return PageData{}, fmt.Errorf("Failed to fetch HTML, error: %v", err)
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
		ImageURLs:     imgs,
	}, nil
}

func extractURLs(HTML string, baseURL *url.URL) (OutgoingLinks []string, err error) {
	doc, err := getDoc(HTML)
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML %v", err)
	}
	doc.Find("a").Each(func(i int, s *goquery.Selection) {
		if att, exists := s.Attr("href"); exists {
			u, err := url.Parse(att)
			if err != nil {
				return
			}
			u = baseURL.ResolveReference(u)
			OutgoingLinks = append(OutgoingLinks, u.String())
		}
	})
	return OutgoingLinks, nil
}
func extractImages(HTML string, baseURL *url.URL) (ImageURLs []string, err error) {
	doc, err := getDoc(HTML)
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML %v", err)
	}
	doc.Find("img").Each(func(i int, s *goquery.Selection) {
		if att, exists := s.Attr("src"); exists {
			u, err := url.Parse(att)
			if err != nil {
				return
			}
			u = baseURL.ResolveReference(u)
			ImageURLs = append(ImageURLs, u.String())
		}
	})
	return ImageURLs, nil
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
