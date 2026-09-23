-- name: GetBacklinkCount :many
SELECT to_page_id,COUNT(*) AS backlink_count
FROM links 
WHERE to_page_id = ANY(@link_ids::int[]) AND to_page_id != from_page_id -- correction for pages that link to them selves (most of them lol)
GROUP BY to_page_id;

-- name: GetForwardlinks :many
SELECT from_page_id,to_page_id,url,title 
FROM links 
JOIN pages ON pages.id = to_page_id 
WHERE from_page_id = @page_id::int  AND to_page_id != from_page_id; 

-- name: GetBacklinks :many
SELECT from_page_id,to_page_id,url,title 
FROM links 
JOIN pages ON pages.id = from_page_id 
WHERE to_page_id = @page_id::int AND to_page_id != from_page_id; 