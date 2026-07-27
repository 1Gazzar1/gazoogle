-- name: GetAllPostings :many 
SELECT * FROM postings; 

-- name: GetPostingById :one 
SELECT * FROM postings 
WHERE (id = $1); 


-- name: CreatePosting :one 
INSERT INTO postings(word,page_id,tf,tf_idf) VALUES($1,$2,$3,$4) 
RETURNING *;

-- name: UpdateTfIdf :one 
UPDATE postings 
SET tf_idf = $2
WHERE (id = $1)
RETURNING *;