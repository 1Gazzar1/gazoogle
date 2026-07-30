package main

import (
	"context"
	"log"

	"github.com/1gazzar1/gazoogle/indexer/db"
	"github.com/1gazzar1/gazoogle/indexer/internal"
	"github.com/1gazzar1/gazoogle/indexer/util"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/pgvector/pgvector-go"
)

func worker(ch chan struct{}, pgDb internal.Queries, ctx context.Context) {
	for range ch {
		indexPage(pgDb, ctx)
	}
}

func indexPage(pgDb internal.Queries, ctx context.Context) {
	pd, err := db.GetNextPageData()
	if err != nil {
		log.Printf("failed to pop page from indexer queue: %v", err)
		return
	}

	tokens, output, err := util.BuildPageWithWeightTF(pd.HTML)
	if err != nil {
		log.Printf("failed to build/tokenize page: %v", err)
		return
	}
	headings := util.UnTokenizeText(tokens["h1"], tokens["h2"])

	// TODO: make embedding here
	var embedding pgvector.Vector

	// if it there's an error creating the page it will update it.
	page, err := pgDb.CreatePage(ctx, internal.CreatePageParams{Url: pd.URL, Heading: pgtype.Text{String: headings, Valid: true}, Title: pgtype.Text{String: pd.Title, Valid: true}, Embedding: embedding})
	if err != nil {
		log.Printf("Failed to create page, after trying to update,err: %v", err)
		return
	}
	var terms []string
	for term, _ := range output {
		terms = append(terms, term)
	}
	// this creates terms if they don't exist, increments df by 1 if they do
	_, err = pgDb.CreateTerms(ctx, terms)
	if err != nil {
		log.Printf("Failed to create/update terms: %v", err)
		return
	}
	var postings []internal.CreatePostingsParams
	for term, freq := range output {
		postings = append(postings, internal.CreatePostingsParams{Word: term, Tf: freq, PageID: page.ID})
	}
	_, err = pgDb.CreatePostings(ctx, postings)
	if err != nil {
		log.Printf("Failed to create postings: %v", err)
		return
	}

	// we do this now so the updating links doesn't crash
	blankPages, err := pgDb.CreateBlankPages(ctx, pd.OutgoingLinks)
	if err != nil {
		log.Printf("failed to create pages in bulk: %v", err)
	}

	var linkObj []internal.InsertLinksParams
	for _, bp := range blankPages {
		linkObj = append(linkObj, internal.InsertLinksParams{FromPageID: page.ID, ToPageID: bp.ID})
	}
	_, err = pgDb.InsertLinks(ctx, linkObj)
	if err != nil {
		log.Printf("Couldn't update links,err: %v", err)
		return
	}
	// now we update the metadata
	_, err = pgDb.UpdateDocCountAndAvgDocLength(ctx, float32(len(tokens)))
	if err != nil {
		log.Printf("Failed to update metadata: %v", err)
		return
	}

	// image stuff here
	var images []internal.CreateImagesParams
	for imgURL, altText := range pd.ImageMap {
		// TODO: do image alt text embedding here
		var embedding pgvector.Vector
		images = append(images, internal.CreateImagesParams{Url: imgURL, AltText: altText, Embedding: embedding})
	}
	_, err = pgDb.CreateImages(ctx, images)
	if err != nil {
		log.Printf("Failed to create images, err: %v", err)
		return
	}
}
