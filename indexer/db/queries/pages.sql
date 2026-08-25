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
INSERT INTO pages( url,heading,title,embedding,doc_length) 
VALUES($1,$2,$3,$4,$5) 
ON CONFLICT (url) DO 
UPDATE SET heading = $2, title = $3 , embedding = $4, doc_length = $5
RETURNING *; 

-- name: CreateBlankPages :many
-- this one is made so when indexing a page, we first create blank pages to the forward links 
-- to update the links, then later we update these pages 
INSERT INTO pages (url)
SELECT unnest($1::text[])
ON CONFLICT DO UPDATE SET url = EXCLUDED.url -- here excluded is the row that made the conflict, this is a trick so it would return the id even if it was already there so then we update the links correctly 
RETURNING id;
