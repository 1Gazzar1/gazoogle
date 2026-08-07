import express, { ErrorRequestHandler } from "express";
import { CustomError, ERRORS } from "@/errors/error.js";
import { loadEnvFile } from "node:process";
import helmet from "helmet";
import { cleanQuery } from "@/util/cleanQuery.js";
import { doLevenshtein } from "@/util/levenshtein.js";
import { getAllVocab } from "@/internal/vocab_sql.js";
import { initDb } from "@/db/db.js";
import { getPagesBytWords } from "@/internal/retreival_sql.js";
import { getBM25 } from "@/util/bm25.js";
import { getDocInfo } from "@/internal/metadata_sql.js";
import { embed } from "@/util/embeddings.js";
import { b, k1, SearchLimit } from "@/constants/constants.js";
import {
    searchPageEmbeddings,
    searchImageEmbeddings,
} from "@/internal/embeddings_sql.js";
import { BM25Page, EmbeddingPage, Term } from "@/types/page.js";
import { BM25Params } from "@/types/bm25.js";
import { rrf } from "@/util/rrf.js";

loadEnvFile();

export const app = express();
const PORT = process.env.PORT;
const POSTGRES = process.env["POSTGRES_DB"];

const dbClient = await initDb(POSTGRES);

// middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cors());

app.get("/", (req, res) => {
    console.log(req.method, req.host, req.hostname);
    res.json("Hello world");
});
app.get("/search", async (req, res) => {
    const q = req.query["q"] as string;
    const qWords = cleanQuery(q);

    if (qWords.length <= 0) throw ERRORS.BAD_REQUEST("enter a valid query bro");

    const vocabTable = await getAllVocab(dbClient);
    const vocabStems: Record<string, string> = {};
    vocabTable.forEach((row) => {
        vocabStems[row.word] = row.stem;
    });

    let corrected = false;

    const finalQuery = qWords.map((word) => {
        if (vocabStems[word]) {
            // exit early if the word is correct
            return word;
        }
        const closest = doLevenshtein(word, Object.keys(vocabStems));
        if (word !== closest) {
            corrected = true;
            return closest;
        }
        return word;
    });

    if (finalQuery.length <= 0)
        throw ERRORS.BAD_REQUEST(
            "your query was so generic it went to the shadow realm",
        );

    const stems = finalQuery.map((q) => vocabStems[q]);
    // this gets a JOIN of 3 tables ( postings, terms and pages ) to gather all data to calc bm25
    const data = await getPagesBytWords(dbClient, {
        words: stems,
    });

    if (!data || data.length <= 0)
        throw ERRORS.NOTFOUND("no bm25 results, somehow ?");

    const qEmbedding = await embed(q); // i decided to embed the actual query and not the cleaned version,
    const _embeddingResults = await searchPageEmbeddings(dbClient, {
        embedding: JSON.stringify(qEmbedding),
        count: SearchLimit,
    });
    if (!_embeddingResults || _embeddingResults.length <= 0)
        throw ERRORS.NOTFOUND("no embedding results, somehow ?");

    const embeddingResults = _embeddingResults.map((row): EmbeddingPage => {
        return {
            type: "embedding",
            heading: row.heading ?? "",
            id: row.id,
            title: row.title ?? "",
            url: row.url,
        };
    });

    const docsInfo = await getDocInfo(dbClient);

    if (!docsInfo) throw ERRORS.INTERNAL("failed to get doc info :(");

    const resultsMap: Record<string, BM25Page> = {};
    for (const row of data) {
        const params: BM25Params = {
            avgDocLen: docsInfo?.avgDocLength ?? 0,
            totalDocs: docsInfo?.totalDocuments ?? 0,
            b: b,
            k1: k1,
            df: row.df,
            docLen: row.docLength ?? 0,
            tf: row.tf,
        };
        const score = getBM25(params);

        if (resultsMap[row.url]) {
            const term: Term = {
                term: row.term,
                df: row.df,
                tf: row.tf,
            };
            resultsMap[row.url].bm25Score += score;
            resultsMap[row.url].terms.push(term);
            continue;
        }
        resultsMap[row.url] = {
            type: "bm25",
            heading: row.heading ?? "",
            id: row.pageId,
            bm25Score: score,
            title: row.title ?? "",
            url: row.url,
            terms: [
                {
                    term: row.term,
                    df: row.df,
                    tf: row.tf,
                },
            ],
        };
    }

    const bm25Results = Object.values(resultsMap);
    bm25Results.sort((a, b) => b.bm25Score - a.bm25Score);

    // rrf to combine both results into one
    const finalResult = rrf(
        bm25Results.slice(0, SearchLimit), // only take the best 100 pages from bm25, if you take all, embedding will almost always win
        embeddingResults,
    );

    res.status(200).json({
        corrected,
        q: finalQuery,
        results: finalResult.slice(0, 10),
    });
});

app.get("/images", async (req, res) => {
    // embed the query text
    const q = req.query["q"] as string;
    if (q.trim().length <= 0)
        throw ERRORS.BAD_REQUEST("bro just search for something");

    const qEmbedding = await embed(q);

    // search against the images alt text in the db
    const images = await searchImageEmbeddings(dbClient, {
        embedding: JSON.stringify(qEmbedding),
        count: SearchLimit,
    });

    if (!images || images.length <= 0)
        throw ERRORS.NOTFOUND("didn't find any images somehow");

    res.status(200).json({
        images,
    });
});

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (err instanceof CustomError) {
        const errMsg = `ERROR: ${err.name}\nSTATUS: ${err.statusCode}\nMESSAGE: ${err.message}`;
        res.status(err.statusCode).send(errMsg);
    } else {
        res.status(500).send(err.message || "INTERNAL ERROR");
    }
};

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});
