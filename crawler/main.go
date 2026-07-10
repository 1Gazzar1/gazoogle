package main

import (
	"fmt"
	"log"
)

func main() {
	pagedata, err := buildPageData("https://en.wikipedia.org/wiki/Ultrakill")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(pagedata.title)
	fmt.Println(pagedata.ImageURLs)
}
