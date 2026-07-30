-- name: UpdateDocCountAndAvgDocLength :one
INSERT INTO metadata (id, total_documents, avg_doc_length)
VALUES (true, 1, $1)
ON CONFLICT (id) DO UPDATE
SET
    total_documents = total_documents + 1,
    avg_doc_length = (
        avg_doc_length * total_documents + $1
    ) / (total_documents + 1)
RETURNING *;