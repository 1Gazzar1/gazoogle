-- name: CreateTerms :many 
INSERT INTO terms (term) 
SELECT unnest($1::text[])
ON CONFLICT (term) DO 
UPDATE SET df = terms.df + 1
RETURNING *;