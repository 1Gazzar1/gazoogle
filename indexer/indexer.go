package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sort"
	"sync"
	"time"

	"github.com/1gazzar1/gazoogle/indexer/constants"
	"github.com/1gazzar1/gazoogle/indexer/db"
	"github.com/1gazzar1/gazoogle/indexer/internal"
	"github.com/1gazzar1/gazoogle/indexer/util"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pgvector/pgvector-go"
	"github.com/redis/go-redis/v9"
)

func worker(wg *sync.WaitGroup, pgDb *pgxpool.Pool, queries *internal.Queries, ctx context.Context) {
	defer func() {
		wg.Done()
	}()
	for {
		num, err := queries.GetDocCount(ctx)
		if err != nil {
			log.Printf("Failed to get document count, err: %v", err)
		}
		// limit to stop the indexer if we reache our goal (1M pages indexed)
		if num >= constants.PageLimit {
			return
		}
		pd, err := db.GetNextPageData()
		// this means that the queue is empty
		if errors.Is(err, redis.Nil) {
			log.Printf("Indexer Queue is Empty, Pausing worker for 5 secs, err: %v", err)
			time.Sleep(5 * time.Second)
			continue
		}
		if err != nil {
			log.Printf("failed to pop page from indexer queue: %v", err)
			continue
		}
		err = doWithTx(&pd, pgDb, ctx, queries, indexPage)
		if err != nil {
			db.PushPageBackToRedis(pd)
		}
	}
}

func doWithTx(pd *db.PageData, db *pgxpool.Pool, ctx context.Context, queries *internal.Queries,
	fn func(pd *db.PageData, queries *internal.Queries, ctx context.Context) error) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	// this is safe is tx.commit() is called first
	defer tx.Rollback(ctx)

	qtx := queries.WithTx(tx)

	err = fn(pd, qtx, ctx)

	if err != nil {
		// defer kicks in and rolls back
		log.Printf("Something went wrong, rolling back changes.., err: %v", err)
		return err
	}
	return tx.Commit(ctx)
}

func indexPage(pd *db.PageData, pgDb *internal.Queries, ctx context.Context) error {

	originalText, wordStems, tokens, output, err := util.BuildPageWithWeightTF(pd.HTML)
	if err != nil {
		return fmt.Errorf("failed to build/tokenize page: %v", err)
	}
	headings := util.UnTokenizeText(tokens["h1"], tokens["h2"])

	modelOutput, err := util.Embed(originalText)
	if err != nil {
		return fmt.Errorf("Embedding Model Failed: %w", err)
	}
	embedding := pgvector.NewVector(modelOutput)

	var docLength int
	for _, token := range tokens {
		docLength += len(token)
	}
	// if it there's an error creating the page it will update it.
	page, err := pgDb.CreatePage(ctx, internal.CreatePageParams{Url: pd.URL,
		Heading:   pgtype.Text{String: headings, Valid: true},
		Title:     pgtype.Text{String: pd.Title, Valid: true},
		Embedding: embedding,
		DocLength: pgtype.Int4{Int32: int32(docLength), Valid: true}})
	if err != nil {
		return fmt.Errorf("Failed to create page, err: %w", err)
	}
	log.Printf("Created Page: %v", page.Url)
	var terms []string
	for term := range output {
		terms = append(terms, term)
	}
	// sort the terms to avoid deadlocks (locking rows)
	sort.Strings(terms)

	// this creates terms if they don't exist, increments df by 1 if they do
	_, err = pgDb.CreateTerms(ctx, terms)
	if err != nil {
		return fmt.Errorf("Failed to create/update terms: %v", err)
	}
	var postings []internal.CreatePostingsParams
	for term, freq := range output {
		postings = append(postings, internal.CreatePostingsParams{Word: term, Tf: freq, PageID: page.ID})
	}
	_, err = pgDb.CreatePostings(ctx, postings)
	if err != nil {
		return fmt.Errorf("Failed to create postings: %v", err)
	}
	log.Printf("Updated Terms & Created Postings for Page: %v", page.Url)

	// inserting original words into the vocab table
	var ogWords []string
	var stems []string
	for ogWord, stem := range wordStems {
		ogWords = append(ogWords, ogWord)
		stems = append(stems, stem)
	}
	pgDb.CreateVocabs(ctx, internal.CreateVocabsParams{Column1: ogWords, Column2: stems})

	// we do this now so the updating links doesn't crash
	ids, err := pgDb.CreateBlankPages(ctx, pd.OutgoingLinks)
	if err != nil {
		return fmt.Errorf("failed to create pages in bulk: %v", err)
	}
	var linkObj []internal.InsertLinksParams
	for _, id := range ids {
		linkObj = append(linkObj, internal.InsertLinksParams{FromPageID: page.ID, ToPageID: id})
	}
	_, err = pgDb.InsertLinks(ctx, linkObj)
	if err != nil {
		return fmt.Errorf("Couldn't update links,err: %v", err)
	}
	// now we update the metadata
	_, err = pgDb.UpdateDocCountAndAvgDocLength(ctx, float32(docLength))
	if err != nil {
		return fmt.Errorf("Failed to update metadata: %v", err)
	}
	log.Printf("Created outgoing Blank Pages for page: %v", page.Url)
	// image stuff here
	var images []internal.CreateImagesParams
	for imgURL, altText := range pd.ImageMap {
		altTextModelOutput, err := util.Embed(altText)
		embedding := pgvector.NewVector(altTextModelOutput)

		if err != nil {
			return fmt.Errorf("Embedding Model Failed: %w", err)
		}

		images = append(images, internal.CreateImagesParams{Url: imgURL, AltText: altText, Embedding: embedding})
	}
	_, err = pgDb.CreateImages(ctx, images)
	if err != nil {
		return fmt.Errorf("Failed to create images, err: %v", err)
	}
	log.Printf("Created Images for Page: %v", page.Url)
	return nil
}
