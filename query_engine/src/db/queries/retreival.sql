-- name: GetPagesBytWords :many 
SELECT page_id,tf,terms.df,pages.doc_length,terms.term,pages.url,pages.heading,pages.title 
FROM postings 
JOIN terms ON word = terms.term 
JOIN pages ON page_id = pages.id 
WHERE word = ANY(@words::text[]);