-- name: SearchPageEmbeddings :many 
SELECT * FROM pages 
ORDER BY embedding <=> @embedding::Vector(384)
LIMIT @count::int; 

-- name: SearchImageEmbeddings :many 
SELECT * from images
ORDER BY embedding <=> @embedding::Vector(384)
LIMIT @count::int;