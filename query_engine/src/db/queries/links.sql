-- name: GetBacklinkCount :many
SELECT to_page_id,COUNT(*) AS backlink_count
FROM links 
WHERE to_page_id = ANY(@link_ids::int[])
GROUP BY to_page_id;