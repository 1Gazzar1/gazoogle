-- name: SearchEmbeddings :many 
SELECT * FROM pages 
ORDER BY embedding <=> @embedding::Vector(384)
LIMIT @count::int; 