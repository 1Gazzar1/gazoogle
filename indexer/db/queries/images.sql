-- name: GetAllImages :many  
SELECT * FROM images;   

-- name: GetImageById :one 
SELECT * FROM images 
WHERE (id = $1);

-- name: CreateImage :one 
INSERT INTO images(alt_text,url,embedding) VALUES ($1,$2,$3)
RETURNING *;

-- name: CreateImages :exec 
INSERT INTO images(url,alt_text,embedding) 
SELECT unnest(@urls::text[]), unnest(@altTexts::text[]), unnest(@embeddings::Vector(384)[])
ON CONFLICT (url) DO NOTHING;