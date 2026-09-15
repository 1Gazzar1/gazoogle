-- name: SearchPageEmbeddings :many 
SELECT id FROM pages -- we're gonna retreive it again anyways so reduce the width
ORDER BY embedding <=> @embedding::Vector(384)
LIMIT @count::int; 

-- name: SearchImageEmbeddings :many 
SELECT id,alt_text,url from images
ORDER BY embedding <=> @embedding::Vector(384)
LIMIT @count::int;