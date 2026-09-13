-- name: SearchPageEmbeddings :many 
SELECT id,url,heading,title FROM pages 
ORDER BY embedding <=> @embedding::Vector(384)
LIMIT @count::int; 

-- name: SearchImageEmbeddings :many 
SELECT id,alt_text,url from images
ORDER BY embedding <=> @embedding::Vector(384)
LIMIT @count::int;