-- name: GetAllPostings :many 
SELECT * FROM postings; 

-- name: GetPostingById :one 
SELECT * FROM postings 
WHERE (id = $1); 


-- name: CreatePosting :one 
INSERT INTO postings(word,page_id,tf) VALUES($1,$2,$3) 
RETURNING *;

-- name: CreatePostings :copyfrom 
INSERT INTO postings(word,page_id,tf) 
VALUES($1,$2,$3); 