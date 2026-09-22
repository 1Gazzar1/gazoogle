package main

import (
	"crypto/md5"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/1gazzar1/gazoogle/indexer/constants"
	"github.com/1gazzar1/gazoogle/indexer/db"
	"github.com/1gazzar1/gazoogle/indexer/internal"
	"github.com/1gazzar1/gazoogle/indexer/util"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/pgvector/pgvector-go"
	"github.com/redis/go-redis/v9"
)

func (cnf *config) worker() {
	defer cnf.wg.Done()
	for {
		num, err := cnf.queries.GetDocCount(cnf.ctx)
		if err != nil {
			log.Printf("Failed to get document count, err: %v", err)
		}
		// limit to stop the indexer if we reached our goal (1M pages indexed)
		if num >= constants.PageLimit {
			log.Printf("Reached Page Limit, Existing now...")
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
		err = cnf.doWithTx(&pd, cnf.indexPage)
		if err != nil {
			db.PushPageBackToRedis(pd)
		}
	}
}

func (cnf *config) doWithTx(pd *db.PageData,
	fn func(pd *db.PageData, queries *internal.Queries) (termsChInput, blankPagesChInput, error)) error {
	tx, err := cnf.pool.Begin(cnf.ctx)
	if err != nil {
		return err
	}
	// this is safe if tx.commit() is called first
	defer tx.Rollback(cnf.ctx)

	qtx := cnf.queries.WithTx(tx)

	termsInput, blankPagesInput, err := fn(pd, qtx)

	if err != nil {
		// defer kicks in and rolls back
		log.Printf("Something went wrong, rolling back changes.., err: %v", err)
		return err
	}
	err = tx.Commit(cnf.ctx)
	if err != nil {
		return err
	}
	// send the data to the writers AFTER the transaction finishes
	// that way the page has to exist first before fan in writers
	cnf.blankPagesCh <- blankPagesInput
	cnf.termsCh <- termsInput
	return nil
}

// pgDb here is the queries but in the transaction
// i think i'm not supposed to use cnf.queries here
func (cnf *config) indexPage(pd *db.PageData, pgDb *internal.Queries) (termsChPayload termsChInput, blankPagesChPayload blankPagesChInput, returnedError error) {
	var err error
	var start = time.Now()
	defer func() {
		cnf.writeMetric(fmt.Sprintf("Indexed %v Successfully!", pd.URL), int(time.Since(start).Milliseconds()), returnedError)
	}()

	originalText, wordStems, tokens, termFreq, err := util.BuildPageWithWeightTF(pd.HTML)
	if err != nil {
		return termsChPayload, blankPagesChPayload, fmt.Errorf("failed to build/tokenize page: %v", err)
	}
	headings := util.UnTokenizeText(tokens["h1"], tokens["h2"])

	modelOutput, err := util.Embed(originalText)
	if err != nil {
		return termsChPayload, blankPagesChPayload, fmt.Errorf("Embedding Model Failed: %w", err)
	}
	embedding := pgvector.NewVector(modelOutput)

	var docLength int
	for _, token := range tokens {
		docLength += len(token)
	}
	// if it there's an error creating the page it will update it.
	page, err := pgDb.CreatePage(cnf.ctx, internal.CreatePageParams{Url: pd.URL,
		Heading:   pgtype.Text{String: headings, Valid: true},
		Title:     pgtype.Text{String: pd.Title, Valid: true},
		Embedding: embedding,
		DocLength: pgtype.Int4{Int32: int32(docLength), Valid: true}})
	if err != nil {
		return termsChPayload, blankPagesChPayload, fmt.Errorf("Failed to create page, err: %w", err)
	}
	log.Printf("Created Page: %v", page.Url)

	// now we update the metadata
	_, err = pgDb.UpdateDocCountAndAvgDocLength(cnf.ctx, float32(docLength))
	if err != nil {
		return termsChPayload, blankPagesChPayload, fmt.Errorf("Failed to update metadata: %v", err)
	}
	// image stuff here
	// only do the image stuff if there's actually images :3
	if len(pd.ImageMap) >= 1 {

		var urls = make([]string, 0, len(pd.ImageMap))
		var altTexts = make([]string, 0, len(pd.ImageMap))
		var hashes = make([]string, 0, len(pd.ImageMap))
		hasher := md5.New() // md5 cuz it's fast '_'

		for imgURL, altText := range pd.ImageMap {
			urls = append(urls, imgURL)
			altTexts = append(altTexts, altText)

			hasher.Reset()
			hasher.Write([]byte(imgURL))
			hashes = append(hashes, hex.EncodeToString((hasher.Sum(nil)))) // go strings apprently aren't strings, they're bytes undercover, they're not utf-8
		}
		modelOutputs, err := util.EmbedBatch(altTexts)
		if err != nil {
			return termsChPayload, blankPagesChPayload, fmt.Errorf("Embedding Model Failed, err: %w", err)
		}

		embeddings := make([]pgvector.Vector, 0, len(modelOutputs))
		for _, vector := range modelOutputs {
			embeddings = append(embeddings, pgvector.NewVector(vector))
		}

		err = pgDb.CreateImages(cnf.ctx, internal.CreateImagesParams{
			Urls:       urls,
			Alttexts:   altTexts,
			Embeddings: embeddings,
			Hashes:     hashes,
		})
		if err != nil {
			return termsChPayload, blankPagesChPayload, fmt.Errorf("Failed to create images, err: %v", err)
		}
		log.Printf("Created Images for Page: %v", page.Url)
	}

	// this stuff is excuted at the end of the transaction to avoid the fan-in writer messing with the transaction

	// sending the terms created earlier to the terms channel
	termsInput := termsChInput{
		pageId:    page.ID,
		termFreq:  termFreq,
		wordStems: wordStems,
	}
	// sending all outgoing links to the blankpages channel
	blankPageInput := blankPagesChInput{
		pageId:        page.ID,
		outgoingLinks: pd.OutgoingLinks,
	}
	return termsInput, blankPageInput, nil
}
