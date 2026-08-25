-- name: CreateImages :exec 
INSERT INTO images(url,alt_text,embedding,url_hash) 
SELECT unnest(@urls::text[]), unnest(@altTexts::text[]), unnest(@embeddings::Vector(384)[]),unnest(@hashes::text[])
ON CONFLICT (url_hash) DO NOTHING;