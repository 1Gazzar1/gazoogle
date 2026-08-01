-- name: CreateVocabs :many
INSERT INTO vocab (word, stem)
SELECT unnest($1::text[]), unnest($2::text[])
ON CONFLICT (word) DO NOTHING
RETURNING *;