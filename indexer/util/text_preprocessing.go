package util

import (
	"fmt"
	"log"
	"regexp"
	"strings"

	"github.com/1gazzar1/gazoogle/indexer/constants"
	"github.com/kljensen/snowball"
)

var bannedClasses = `.reference,.reflist,.navbox,.vertical-navbox,.metadata,.mw-editsection,.catlinks,.toc,.hatnote,.thumb,.magnify,.noprint`
var bannedTags = `script,style,noscript,template,svg,canvas,iframe,object,embed,head,meta,link,base,source,picture,audio,video,track,param,form,input,textarea,button,select,option,datalist,output,label,fieldset,legend,dialog,menu,portal,sup`

var specialCharRegex = regexp.MustCompile(`[^a-zA-Z0-9]+`)

func CleanTokens(tokens []string) (output []string) {
	for _, word := range tokens {
		// 1. lowercase
		word = strings.ToLower(word)

		// 2. normalization (removing punctuation,numbers)
		// this is important actually, we replace punctuation like "/,.-" with " " instead of ""
		// this way "can/could" would be "can could" and not "cancould"
		word = specialCharRegex.ReplaceAllString(word, " ")

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

func BuildPageWithWeightTF(HTML string) (tokens map[string][]string, output map[string]float32, err error) {

	tokens = make(map[string][]string)
	output = make(map[string]float32)

	doc, err := getDoc(HTML)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to parse HTML %v", err)
	}

	// remove useless tag before processing useful ones.
	doc.Find(bannedClasses).Remove()
	doc.Find(bannedTags).Remove()

	for tag, weight := range constants.TagWeights {
		// it should be faster now because we don't parse the html every iteration
		// we just use doc after cleaning it from garbage
		_tokens, err := ExtractAllTextFromTag(doc, tag)
		tokens[tag] = _tokens
		if err != nil {
			return tokens, output, fmt.Errorf("Failed to extract tokens: %v", err)
		}
		cleanTokens := CleanTokens(_tokens)

		for _, word := range cleanTokens {
			if _, exists := output[word]; exists {
				output[word] += weight
				continue
			}
			output[word] = weight

		}
	}
	return tokens, output, nil

}
