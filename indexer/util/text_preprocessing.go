package util

import (
	"fmt"
	"log"
	"regexp"
	"strings"

	"github.com/1gazzar1/gazoogle/indexer/constants"
	"github.com/kljensen/snowball"
)

var specialCharRegex = regexp.MustCompile(`[^a-zA-Z0-9]+`)

func CleanTokens(tokens []string) (output []string) {
	for _, word := range tokens {
		// 1. lowercase
		word = strings.ToLower(word)

		// 2. normalization (removing punctuation,numbers)
		word = specialCharRegex.ReplaceAllString(word, "")

		if strings.TrimSpace(word) == "" {
			continue
		}

		// 3. removing stop words like you, the, etc
		if _, exists := constants.EnglishStopWords[word]; exists {
			continue
		}

		// 4. stemming, so running => run, organization => organiz, etc
		// last param here is useless
		word, err := snowball.Stem(word, "english", true)
		if err != nil {
			log.Println("error stemming: ", err)
			continue
		}

		// if word is completely replaced then skip it
		if word == "" {
			continue
		}
		output = append(output, word)

	}
	return output
}

// TODO: refactor this so we only parse the HTML once, instead of constatns.TagWeights N times.

func BuildPageWithWeightTF(HTML string) (output map[string]float32, err error) {
	output = make(map[string]float32)
	for tag, weight := range constants.TagWeights {
		tokens, err := ExtractAllTextFromTag(HTML, tag)
		if err != nil {
			return output, fmt.Errorf("Failed to extract tokens: %v", err)
		}
		cleanTokens := CleanTokens(tokens)

		for _, word := range cleanTokens {
			if _, exists := output[word]; exists {
				output[word] += weight
				continue
			}
			output[word] = weight

		}
	}
	return output, nil

}
