-- name: GetAllImages :many  
SELECT * FROM images;   

-- name: GetImageById :one 
SELECT * FROM images 
WHERE (id = $1);

-- name: CreateImage :one 
INSERT INTO images(alt_text,url,embedding) VALUES ($1,$2,$3)
RETURNING *;
