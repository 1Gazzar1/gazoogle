-- name: GetPageById :one  
SELECT * 
FROM pages 
WHERE (id = $1);

-- name: GetPageByUrl :one  
SELECT * 
FROM pages 
WHERE (url = $1);


-- name: GetAllPages :many 
SELECT * FROM pages; 

-- name: CreatePage :one 
INSERT INTO pages( url,heading,title,embedding) 
VALUES($1,$2,$3,$4)
RETURNING *; 

-- name: CreateBlankPages :many
-- this one is made so when indexing a page, we first create blank pages to the forward links 
-- to update the links, then later we update these pages 
INSERT INTO pages (url)
SELECT unnest($1::text[])
RETURNING *;

-- name: UpdatePageByURL :one 
UPDATE pages 
SET title = $2,heading = $3,embedding = $4
WHERE (url = $1)
RETURNING *;

 


