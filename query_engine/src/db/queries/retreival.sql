-- name: GetPagesBytWords :many 
SELECT * FROM postings 
JOIN terms ON word = terms.term 
JOIN pages ON page_id = pages.id 
WHERE word in (unnest(@words::text[]));