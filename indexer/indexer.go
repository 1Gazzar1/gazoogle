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
		log.Println("failed to pop page from indexer queue: ", err)
		return
	}

	tokens, output, err := util.BuildPageWithWeightTF(pd.HTML)
	if err != nil {
		log.Println("failed to build/tokenize page: ", err)
		return
	}
	headings := util.UnTokenizeText(tokens["h1"], tokens["h2"])

	// TODO: make embedding here
	var embedding pgvector.Vector

	// we will assume that the page was already created before by another worker by CreateBlankPages
	// if it makes an error then just create a new page (usually will happen on first page poped by a worker)
	page, err := pgDb.UpdatePageByURL(ctx, internal.UpdatePageByURLParams{Url: pd.URL, Heading: pgtype.Text{String: headings, Valid: true}, Title: pgtype.Text{String: pd.Title, Valid: true}, Embedding: embedding})
	if err != nil {
		log.Println("failed to update page, creating a new one, url: %v, err: %v", pd.URL, err)
		page, err = pgDb.CreatePage(ctx, internal.CreatePageParams{Url: pd.URL, Heading: pgtype.Text{String: headings, Valid: true}, Title: pgtype.Text{String: pd.Title, Valid: true}, Embedding: embedding})
		if err != nil {
			log.Println("Failed to create page, after trying to update,err: %v", err)
			return
		}
	}
	var terms []string
	for term, _ := range output {
		terms = append(terms, term)
	}
	// this creates terms if they don't exist, increments df by 1 if they do
	_, err = pgDb.CreateTerms(ctx, terms)
	if err != nil {
		log.Println("Failed to create/update terms: %v", err)
		return
	}
	var postings []internal.CreatePostingsParams
	for term, freq := range output {
		postings = append(postings, internal.CreatePostingsParams{Word: term, Tf: freq, PageID: page.ID})
	}
	_, err = pgDb.CreatePostings(ctx, postings)
	if err != nil {
		log.Println("Failed to create postings: %v", err)
		return
	}

	// we do this now so the updating links doesn't crash
	blankPages, err := pgDb.CreateBlankPages(ctx, pd.OutgoingLinks)
	if err != nil {
		log.Println("failed to create pages in bulk: ", err)
	}

	var linkObj []internal.InsertLinksParams
	for _, bp := range blankPages {
		linkObj = append(linkObj, internal.InsertLinksParams{FromPageID: page.ID, ToPageID: bp.ID})
	}
	_, err = pgDb.InsertLinks(ctx, linkObj)
	if err != nil {
		log.Println("Couldn't update links,err: ", err)
		return
	}

	var images []internal.CreateImagesParams
	for imgURL, altText := range pd.ImageMap {
		// TODO: do image alt text embedding here
		var embedding pgvector.Vector
		images = append(images, internal.CreateImagesParams{Url: imgURL, AltText: altText, Embedding: embedding})
	}
	// images part
	pgDb.CreateImages(ctx, images)
}
