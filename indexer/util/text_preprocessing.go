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

func CleanTokens(tokens []string) (wordStems map[string]string, cleanedTokens []string) {
	wordStems = make(map[string]string)
	for _, raw := range tokens {
		// 1. lowercase
		raw = strings.ToLower(raw)

		// 2. normalization (removing punctuation,numbers)
		// this is important actually, we replace punctuation like "/,.-" with " " instead of ""
		// this way "can/could" would be "can could" and not "cancould"
		raw = specialCharRegex.ReplaceAllString(raw, " ")

		// chat gpt caught this bug :<
		// in the prev step, 'can/could' would be 'can could' which isn't 1 word and stemming would break things
		// so we split on whitespaces.
		for _, word := range strings.Fields(raw) {

			// 3. removing stop words like you, the, etc
			if _, exists := constants.EnglishStopWords[word]; exists {
				continue
			}

			// 4. stemming, so running => run, organization => organiz, etc
			// last param here is useless
			stemmed, err := snowball.Stem(word, "english", true)
			if err != nil {
				log.Println("error stemming: ", err)
				continue
			}

			// if word is completely replaced then skip it
			// or if the word is a single character or digit
			if stemmed == "" || len(stemmed) < 2 {
				continue
			}

			wordStems[word] = stemmed
			cleanedTokens = append(cleanedTokens, stemmed)
		}

	}
	return wordStems, cleanedTokens
}

// it should be faster now because we don't parse the html every iteration
// we just use doc after cleaning it from garbage
func BuildPageWithWeightTF(HTML string) (originalText string, allWordStems map[string]string,
	tokens map[string][]string, termFreq map[string]float32, err error) {
	// tokens is a map of html tags to words containing them, e.g. "h1" : ["game","play"]
	// its purpose is getting the actual doc_length and store it in the db
	tokens = make(map[string][]string)
	// termFreq is the map of words and their weighted tf, e.g. "game" : 7
	// its purpose is counting tf, and storing the words in postings table
	termFreq = make(map[string]float32)
	// unique words is a map of unique words to thier stemmed version, e.g. "studying" : "studi"
	// its purpose is getting all unique words and storing them vocab table, for spell correction
	allWordStems = make(map[string]string)
	// it's what you think it is
	// its purpose is feeding the raw text to the embedding model
	originalText = ""

	doc, err := getDoc(HTML)
	if err != nil {
		return "", nil, nil, nil, fmt.Errorf("failed to parse HTML %v", err)
	}

	// remove useless tag before processing useful ones.
	doc.Find(bannedClasses).Remove()
	doc.Find(bannedTags).Remove()

	for tag, weight := range constants.TagWeights {

		_tokens, err := ExtractAllTextFromTag(doc, tag)
		originalText += UnTokenizeText(_tokens) + "\n"

		tokens[tag] = _tokens
		if err != nil {
			return "", nil, nil, nil, fmt.Errorf("Failed to extract tokens: %v", err)
		}
		wordStems, cleanTokens := CleanTokens(_tokens)

		for k, v := range wordStems {
			allWordStems[k] = v
		}

		// building the inverted tf
		for _, word := range cleanTokens {
			if _, exists := termFreq[word]; exists {
				termFreq[word] += weight
				continue
			}
			termFreq[word] = weight

		}
	}
	return originalText, allWordStems, tokens, termFreq, nil

}
