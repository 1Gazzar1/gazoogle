-- name: GetAllVocab :many
SELECT v.word, v.stem
FROM vocab v 
JOIN terms t ON v.stem = t.term
WHERE t.df > 2; 