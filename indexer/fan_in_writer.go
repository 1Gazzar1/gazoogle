package main

import (
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/1gazzar1/gazoogle/indexer/internal"
)

type termsChInput struct {
	pageId    int32
	termFreq  map[string]float32
	wordStems map[string]string
}
type blankPagesChInput struct {
	pageId        int32
	outgoingLinks []string
}

func fanInWriter[T any](cnf *config, duration time.Duration, ch chan T, flush func(batch *[]T)) {
	// i'm aware that this lacks the roll back feature
	// so if the string(s) we got from a page here and the page crashed then this will still continue making extra ghost data
	// and when the page retries it will create duplicate data
	// BUT during my testing the indexer is a very healthy service, so it shouldn't be a big deal
	batch := make([]T, 0)

	ticker := time.NewTicker(duration)

	for {
		select {
		case term := <-ch:
			batch = append(batch, term)
		case <-ticker.C:
			// tiggers every `duration`
			flush(&batch)
		case <-cnf.ctx.Done():
			// triggers when program ends
			flush(&batch)
			return
		}
	}

}
func (cnf *config) handleTerms(batch *[]termsChInput) {
	if len(*batch) == 0 {
		return
	}
	for _, input := range *batch {
		start := time.Now()
		// extract terms first
		var terms []string
		for term := range input.termFreq {
			terms = append(terms, term)
		}
		tx, err := cnf.pool.Begin(cnf.ctx)
		if err != nil {
			log.Printf("CRITICAL: failed to begin tx in terms writer: %v", err)
			err = fmt.Errorf("CRITICAL: failed to begin tx in terms writer: %w", err)
			writeMetric("", 0, err)
			continue
		}

		qtx := cnf.queries.WithTx(tx)

		// 1. terms
		// sort the terms to avoid deadlocks (locking rows)
		sort.Strings(terms)

		// this creates terms if they don't exist, increments df by 1 if they do
		_, err = qtx.CreateTerms(cnf.ctx, terms)

		if err != nil {
			log.Printf("CRITICAL: Failed to create/update terms in fan-in writer: %v", err)
			err = fmt.Errorf("CRITICAL: Failed to create/update terms in fan-in writer: %w", err)
			writeMetric("", 0, err)
			tx.Rollback(cnf.ctx)
			continue
		}
		// 2. postings
		var postings []internal.CreatePostingsParams
		for term, freq := range input.termFreq {
			postings = append(postings, internal.CreatePostingsParams{Word: term, Tf: freq, PageID: int32(input.pageId)})
		}
		_, err = qtx.CreatePostings(cnf.ctx, postings)
		if err != nil {
			log.Printf("CRITICAL: Failed to create postings in fan-in writer: %v", err)
			err = fmt.Errorf("CRITICAL: Failed to create postings in fan-in writer: %w", err)
			writeMetric("", 0, err)
			tx.Rollback(cnf.ctx)
			continue
		}
		// 3. vocab

		// inserting original words into the vocab table
		var ogWords []string
		var stems []string
		type wordStem struct {
			word string
			stem string
		}
		wordStemArr := make([]wordStem, 0)
		for ogWord, stem := range input.wordStems {
			wordStemArr = append(wordStemArr, wordStem{
				word: ogWord,
				stem: stem,
			})
		}

		sort.Slice(wordStemArr, func(i, j int) bool { return wordStemArr[i].stem < wordStemArr[j].stem })

		for _, wordStem := range wordStemArr {
			ogWords = append(ogWords, wordStem.word)
			stems = append(stems, wordStem.stem)
		}

		_, err = qtx.CreateVocabs(cnf.ctx, internal.CreateVocabsParams{Column1: ogWords, Column2: stems})
		if err != nil {
			log.Printf("CRITICAL: Failed to create/update vocabs in fan-in writer: %v", err)
			err = fmt.Errorf("CRITICAL: Failed to create/update vocabs in fan-in writer: %w", err)
			writeMetric("", 0, err)
			tx.Rollback(cnf.ctx)
			continue
		}
		tx.Commit(cnf.ctx)
		writeMetric(
			fmt.Sprintf("Added %v Terms and Postings (Fan-In Writer), PageId: %v", len(terms), input.pageId),
			int(time.Since(start).Milliseconds()), err)
	}

	// then reset `batch`
	*batch = make([]termsChInput, 0)

}
func (cnf *config) handleBlankPages(batch *[]blankPagesChInput) {
	if len(*batch) == 0 {
		return
	}

	// we do this now so the updating links doesn't crash
	// sort the outgoing links too to solve the deadlock issue via locking rows like in terms table

	for _, blankPgs := range *batch {
		start := time.Now()
		tx, err := cnf.pool.Begin(cnf.ctx)
		if err != nil {
			log.Printf("CRITICAL: failed to begin tx in terms writer: %v", err)
			err = fmt.Errorf("CRITICAL: failed to begin tx in terms writer: %w", err)
			writeMetric("", 0, err)
			continue
		}

		qtx := cnf.queries.WithTx(tx)

		sort.Strings(blankPgs.outgoingLinks)
		ids, err := qtx.CreateBlankPages(cnf.ctx, blankPgs.outgoingLinks)
		if err != nil {
			log.Printf("failed to create pages in bulk: %v", err)
			err = fmt.Errorf("failed to create pages in bulk: %w", err)
			writeMetric("", 0, err)
			tx.Rollback(cnf.ctx)
			continue
		}
		var linkObj []internal.InsertLinksParams
		for _, id := range ids {
			linkObj = append(linkObj, internal.InsertLinksParams{FromPageID: int32(blankPgs.pageId), ToPageID: id})
		}
		_, err = qtx.InsertLinks(cnf.ctx, linkObj)
		if err != nil {
			log.Printf("Couldn't update links,err: %v", err)
			err = fmt.Errorf("Couldn't update links,err: %w", err)
			writeMetric("", 0, err)
			tx.Rollback(cnf.ctx)
			continue
		}
		tx.Commit(cnf.ctx)
		writeMetric(
			fmt.Sprintf("Added %v Blank Pages and Links (Fan-In Writer), PageId: %v", len(ids), blankPgs.pageId),
			int(time.Since(start).Milliseconds()), err)
	}
	// then reset `batch`
	*batch = make([]blankPagesChInput, 0)

}
