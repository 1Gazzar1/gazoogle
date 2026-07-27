-- name: GetForwardLinkIds :many 
SELECT to_page_id FROM links 
WHERE (from_page_id = $1); 

-- name: GetBackLinkIds :many 
SELECT from_page_id FROM links 
WHERE (to_page_id = $1);

-- name: InsertLinks :copyfrom 
INSERT INTO links(from_page_id,to_page_id) 
VALUES ($1,$2);