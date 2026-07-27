CREATE EXTENSION IF NOT EXISTS vector;


-- pages table  
CREATE TABLE IF NOT EXISTS pages ( 
    id SERIAL PRIMARY KEY, 
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    heading TEXT, 
    embedding VECTOR(1556),
    crawled_at TIMESTAMP default now()
);

-- TODO: might need to add a length param here to account for bm25
-- this table is the relation between a page and each word it has 
-- this serves as the inverted index
-- note: i could've extracted word into a 'term' table to make it more efficient, but like this browsing through the data and making queries is easier
CREATE TABLE IF NOT EXISTS postings ( 
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL, 
    page_id INT NOT NULL REFERENCES pages(id),
    tf REAL NOT NULL, -- how many times did 'word' appear in 'page_id' 
    tf_idf REAL NOT NULL, -- represents relationship between word and page: bigger number means word is more related, calculated tf * idf ( globally calculated per word) 
    UNIQUE(word,page_id)
);

-- images table 
CREATE TABLE IF NOT EXISTS images ( 
  id SERIAL PRIMARY KEY,
  alt_text TEXT NOT NULL,
  url TEXT NOT NULL, 
  embedding VECTOR(1556) -- this is an embedding of the alt text and not the actual image 
);

-- this table represents the forward and backward links  
CREATE TABLE IF NOT EXISTS links ( 
  from_page_id INT references pages(id), 
  to_page_id INT references pages(id),
  PRIMARY KEY(from_page_id,to_page_id)
) 







