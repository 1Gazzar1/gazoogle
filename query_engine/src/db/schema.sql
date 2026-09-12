-- this schema was changed like 10 times :<
CREATE EXTENSION IF NOT EXISTS vector;


-- pages table  
CREATE TABLE IF NOT EXISTS pages ( 
    id SERIAL PRIMARY KEY, 
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    heading TEXT, 
    embedding VECTOR(384),
    doc_length INT DEFAULT 0, 
    crawled_at TIMESTAMP DEFAULT now()
);

-- term table (unique words)
-- df here is document freq, or how many times did that term appear in a document 
-- idf is the inverse df, it represents how importatnt a word is, so high df means common, low df means rare
CREATE TABLE IF NOT EXISTS terms ( 
  term TEXT NOT NULL PRIMARY KEY, 
  df INT NOT NULL DEFAULT 1 
  -- idf REAL NOT NULL DEFAULT 0 -- i got rid of idf here cuz i didn't like the idea of a worker updating all the idfs for every term, calculating it on the fly in the query engine seems better
);
-- vocab table 
-- this table is there just for spell correction on the query engine side 
-- the diff between it and the terms table is that terms table keeps track of stemmed words 
-- but the vocab table keeps track of all unique words, e.g. terms has 'studi', while vocab can have 'study','studying','studied' all referencing 'studi' from terms
CREATE TABLE IF NOT EXISTS vocab ( 
  word TEXT NOT NULL PRIMARY KEY,
  stem TEXT NOT NULL REFERENCES terms(term)
);

-- this table is the relation between a page and each word it has 
-- this serves as the inverted index
CREATE TABLE IF NOT EXISTS postings ( 
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL REFERENCES terms(term), 
    page_id INT NOT NULL REFERENCES pages(id),
    tf REAL NOT NULL, -- how many times did 'word' appear in 'page_id'
    -- i had to remove tf_idf, because after recalculating the idf you'd have to pass through ALL the postings and 
    -- update tf_idf, which is very expensive, so instead we'll update the terms table and cacluate tf_idf on the fly     
    -- tf_idf REAL NOT NULL, -- represents relationship between word and page: bigger number means word is more related, calculated tf * idf ( globally calculated per word) 
    UNIQUE(word,page_id)
);

-- images table 
CREATE TABLE IF NOT EXISTS images ( 
  id SERIAL PRIMARY KEY,
  alt_text TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE, 
  url_hash TEXT NOT NULL UNIQUE, -- this column is here because img urls in the internet is way too big that postgres said fuck no i ain't dealin with that shit 
  embedding VECTOR(384) -- this is an embedding of the alt text and not the actual image 
);

-- this table represents the forward and backward links  
CREATE TABLE IF NOT EXISTS links ( 
  from_page_id INT references pages(id), 
  to_page_id INT references pages(id),
  PRIMARY KEY(from_page_id,to_page_id)
);


-- metadata table 
-- i don't know why i haven't thought of something like this before 
-- will hold stuff that i don't want to store in memory, like total_doc_len
CREATE TABLE IF NOT EXISTS metadata (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE,
    total_documents INT NOT NULL DEFAULT 0,
    avg_doc_length REAL NOT NULL DEFAULT 0
);

INSERT INTO metadata(id,total_documents,avg_doc_length) VALUES(TRUE,0,0)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX links_to_page_id_idx
ON links(to_page_id);