# processing the user query 
1. first we tokenize the query so it's a list 
2. then we clean up the query and everything but we don't stem 
3. then we do levenshtien against our vocabs to see if it's there (if not we take the closest match) then stem (or take the stems directly from the table)
4. then we do a query with these words against the postings table then calculate the tf_idf 

--- 
We could go another way, we search the postings table immediatlly, if we don't get any matches then we do levenshtien and continue like the rest 