package util

import (
	"strings"

	"github.com/PuerkitoBio/goquery"
)

func ExtractAllTextFromTag(doc *goquery.Document, tag string) (tokens []string, err error) {

	doc.Find(tag).Each(func(i int, s *goquery.Selection) {
		tok := TokenizeTagText(s.Text())
		tokens = append(tokens, tok...)
	})
	return tokens, nil
}

func getDoc(HTML string) (*goquery.Document, error) {
	reader := strings.NewReader(HTML)
	doc, err := goquery.NewDocumentFromReader(reader)
	if err != nil {
		return nil, err
	}
	return doc, nil
}
