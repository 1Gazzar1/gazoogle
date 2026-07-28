package util

import "strings"

func TokenizeTagText(text string) []string {
	output := make([]string, 0)
	for _, word := range strings.Split(text, " ") {
		w := strings.TrimSpace(word)
		if w == "" {
			continue
		}
		output = append(output, w)
	}
	return output
}

// we use this for rebuilding the headings
func UnTokenizeText(lists ...[]string) string {
	output := ""
	for _, sentence := range lists {
		output += strings.Join(sentence, " ") + "."
	}
	return output
}
