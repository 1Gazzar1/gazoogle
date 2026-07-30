-- name: UpdateDocCountAndAvgDocLength :one
INSERT INTO metadata (id, total_documents, avg_doc_length)
VALUES (true, 1, $1)
ON CONFLICT (id) DO UPDATE
SET
    total_documents = metadata.total_documents + 1,
    avg_doc_length = (
        metadata.avg_doc_length * metadata.total_documents + $1
    ) / (metadata.total_documents + 1)
RETURNING *;

-- name: GetDocCount :one 
SELECT total_documents FROM metadata WHERE id = TRUE; 