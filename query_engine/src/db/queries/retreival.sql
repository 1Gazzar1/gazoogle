-- SELECT page_id,tf,terms.df,pages.doc_length,terms.term,pages.url,pages.heading,pages.title 
-- FROM postings 
-- JOIN terms ON word = terms.term 
-- JOIN pages ON page_id = pages.id 
-- WHERE word = ANY(@words::text[]);

-- now we split the query above into 2 queries, 1 for scoring and 1 for hydration
-- this makes the network delay smaller because the width is smaller, 

-- name: GetBM25RelevantInfoByWords :many 
-- scoring query
SELECT page_id,tf,terms.df,pages.doc_length,terms.term
FROM postings 
JOIN terms ON word = terms.term 
JOIN pages ON page_id = pages.id
WHERE word = ANY(@words::text[]);


-- this one has all the width that we removed from the combined query above 
-- will be called at the end 
-- name: GetPagesById :many
-- hydration query  
SELECT id,url,heading,title 
FROM pages 
WHERE id = ANY(@ids::int[]);