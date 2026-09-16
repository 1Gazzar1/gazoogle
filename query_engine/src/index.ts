import express, { ErrorRequestHandler } from "express";
import { CustomError, ERRORS } from "@/errors/error.js";
import { loadEnvFile } from "node:process";
import helmet from "helmet";
import { cleanQuery } from "@/util/cleanQuery.js";
import { doLevenshtein } from "@/util/levenshtein.js";
import { getAllVocab, GetAllVocabRow } from "@/internal/vocab_sql.js";
import { initDb } from "@/db/db.js";
import { getBM25 } from "@/util/bm25.js";
import { getDocInfo } from "@/internal/metadata_sql.js";
import { embed } from "@/util/embeddings.js";
import { b, k1 } from "@/constants/constants.js";
import {
    searchPageEmbeddings,
    searchImageEmbeddings,
} from "@/internal/embeddings_sql.js";
import { BM25Page, EmbeddingPage, Term } from "@/types/page.js";
import { BM25Params } from "@/types/bm25.js";
import { rrf, RRFPage } from "@/util/rrf.js";
import cors from "cors";
import {
    getBacklinkCount,
    getBacklinks,
    getForwardlinks,
} from "@/internal/links_sql.js";
import { getBacklinkBoost } from "@/util/backlinkBoost.js";
import { vocabBuckets } from "@/util/vocab.js";
import {
    getBM25RelevantInfoByWords,
    getPagesById,
    GetPagesByIdArgs,
} from "@/internal/retreival_sql.js";
import { maxHeaderSize } from "node:http";

loadEnvFile();

export const app = express();
const PORT = process.env.PORT;
const POSTGRES = process.env.POSTGRES_DB;

const dbClient = await initDb(POSTGRES);

// middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use((req, _, next) => {
    const start = Date.now();
    req.on("close", () => {
        console.info(`${req.url} took ${Date.now() - start}ms`);
    });
    next();
});

app.get("/", (req, res) => {
    console.log(req.method, req.host, req.hostname);
    res.json("Hello world");
});

// these are for spell correction
let VOCAB: GetAllVocabRow[] = [];
let BUCKETS: Record<number, string[]> = [];
let LAST_VOCAB_CALL: number = 0;

app.get("/search", async (req, res) => {
    const startTime = Date.now();

    const q = req.query["q"];
    if (!q || typeof q !== "string") throw ERRORS.BAD_REQUEST("invalid query");
    const _page = req.query["page"] ?? 1;
    const page = Number.parseInt(_page as string);
    const _pageSize = req.query["pageSize"] ?? 10;
    const pageSize = Number.parseInt(_pageSize as string);

    const LIMIT = Math.max(100, pageSize * page);

    const qWords = cleanQuery(q);

    const cleanTime = Date.now() - startTime;

    if (qWords.length <= 0) throw ERRORS.BAD_REQUEST("enter a valid query bro");

    let cachedVocab = true;
    // if it was 10 mins since we made a db for vocab then do one
    const dbVocabStartTime = Date.now();
    if (dbVocabStartTime - LAST_VOCAB_CALL > 1000 * 60 * 10) {
        VOCAB = await getAllVocab(dbClient);
        BUCKETS = vocabBuckets(VOCAB);
        LAST_VOCAB_CALL = dbVocabStartTime;
        cachedVocab = false;
    }
    const dbVocabTime = Date.now() - dbVocabStartTime;

    const vocabStems: Record<string, string> = {};
    VOCAB.forEach((row) => {
        vocabStems[row.word] = row.stem;
    });

    const correctionStartTime = Date.now();

    let corrected = false;

    const finalQuery = qWords.map((word) => {
        if (vocabStems[word]) {
            // exit early if the word is correct
            return word;
        }
        const buckets = [
            ...(BUCKETS[word.length + 1] ?? []),
            ...(BUCKETS[word.length] ?? []),
            ...(BUCKETS[word.length - 1] ?? []),
        ];
        const closest = doLevenshtein(word, buckets);
        if (word !== closest) {
            corrected = true;
            return closest;
        }
        return word;
    });
    const correctionTime = Date.now() - correctionStartTime;

    if (finalQuery.length <= 0)
        throw ERRORS.BAD_REQUEST(
            "your query was so generic it went to the shadow realm",
        );

    const stems = finalQuery.map((q) => vocabStems[q]);

    const dbBM25StartTime = Date.now();
    // this gets a JOIN of 3 tables ( postings, terms and pages ) to gather all data to calc bm25
    const data = await getBM25RelevantInfoByWords(dbClient, {
        words: stems,
    });
    const dbBM25ime = Date.now() - dbBM25StartTime;

    if (!data || data.length <= 0)
        throw ERRORS.NOTFOUND("no bm25 results, somehow ?");

    const embeddingStartTime = Date.now();
    const qEmbedding = await embed(q); // i decided to embed the actual query and not the cleaned version,
    const embeddingTime = Date.now() - embeddingStartTime;

    const dbEmbeddingStartTime = Date.now();
    const _embeddingResults = await searchPageEmbeddings(dbClient, {
        embedding: JSON.stringify(qEmbedding),
        count: LIMIT,
    });
    const dbEmbeddingTime = Date.now() - dbEmbeddingStartTime;

    if (!_embeddingResults || _embeddingResults.length <= 0)
        throw ERRORS.NOTFOUND("no embedding results, somehow ?");

    const embeddingResults = _embeddingResults.map((row): EmbeddingPage => {
        return {
            type: "embedding",
            id: row.id,
        };
    });

    const dbMetadataStartTime = Date.now();
    const docsInfo = await getDocInfo(dbClient);
    const dbMetadataTime = Date.now() - dbMetadataStartTime;

    if (!docsInfo) throw ERRORS.INTERNAL("failed to get doc info :(");

    // normalizing the calculating bm25
    const bm25StartTime = Date.now();
    const resultsMap: Record<number, BM25Page> = {};
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

        if (resultsMap[row.pageId]) {
            const term: Term = {
                term: row.term,
                df: row.df,
                tf: row.tf,
            };
            resultsMap[row.pageId].bm25Score += score;
            resultsMap[row.pageId].terms.push(term);
            continue;
        }
        resultsMap[row.pageId] = {
            type: "bm25",
            id: row.pageId,
            bm25Score: score,
            terms: [
                {
                    term: row.term,
                    df: row.df,
                    tf: row.tf,
                },
            ],
        };
    }
    const bm25Time = Date.now() - bm25StartTime;

    const bm25Results = Object.values(resultsMap);
    bm25Results.sort((a, b) => b.bm25Score - a.bm25Score);

    // rrf to combine both results into one
    const rrfStartTime = Date.now();
    const rrfResults = rrf(
        bm25Results.slice(0, LIMIT), // only take the best 100 pages from bm25, if you take all, embedding will almost always win
        embeddingResults,
    );
    const rrfTime = Date.now() - rrfStartTime;

    const dbBacklinkStartTime = Date.now();
    const backlinks = await getBacklinkCount(dbClient, {
        linkIds: rrfResults.map((r) => r.id),
    });
    const dbBacklinkTime = Date.now() - dbBacklinkStartTime;

    const idToBacklinkCount: Record<number, number> = {};
    for (const row of backlinks) {
        idToBacklinkCount[row.toPageId] = +row.backlinkCount;
    }
    // adding backlinkcount as a param
    const finalResult = rrfResults.map((p) => {
        const backlinkCount = idToBacklinkCount[p.id] ?? 0;
        const out: RRFPage = {
            ...p,
            backlinkCount,
        };
        return out;
    });
    // applying backlink boosting and sorting
    finalResult.sort(
        (a, b) =>
            getBacklinkBoost(b.backlinkCount!) * b.rrfScore -
            getBacklinkBoost(a.backlinkCount!) * a.rrfScore,
    );
    // use the hydration query to get the final results with ids
    const paginatedResults = finalResult.slice(
        (page - 1) * pageSize,
        page * pageSize,
    );
    const args: GetPagesByIdArgs = {
        ids: paginatedResults.map((p) => p.id),
    };
    const _results = await getPagesById(dbClient, args);
    // map the paginated results back to have terms and type properties for info preserving order
    const resultMap = new Map(_results.map((row) => [row.id, row]));

    const results = paginatedResults.map((page) => ({
        ...page,
        ...resultMap.get(page.id),
    }));

    const endTime = Date.now() - startTime;
    res.status(200).json({
        corrected,
        q: finalQuery,
        skippedVocabDbCall: cachedVocab,
        pagination: {
            totalResults: finalResult.length,
            page,
            pageSize,
        },
        results,
        durations: {
            totalTime: endTime,
            cleanTime, // including tokenization and cleaning
            dbVocabTime,
            dbBacklinkTime,
            dbBM25ime, // JOIN query
            dbMetadataTime,
            embddingCosineSearch: dbEmbeddingTime, // cosine search
            embeddingTime, // embedding user query
            spellCorrectionTime: correctionTime, // levenshtien
            bm25Time, // calculating the normalizing
            rrfTime,
        },
    });
});

app.get("/images", async (req, res) => {
    const startTime = Date.now();
    // embed the query text
    const q = req.query["q"] as string;
    if (q.trim().length <= 0)
        throw ERRORS.BAD_REQUEST("bro just search for something");

    const qEmbedding = await embed(q);

    // search against the images alt text in the db
    const images = await searchImageEmbeddings(dbClient, {
        embedding: JSON.stringify(qEmbedding),
        count: 100,
    });

    if (!images || images.length <= 0)
        throw ERRORS.NOTFOUND("didn't find any images somehow");

    res.status(200).json({
        totalTime: Date.now() - startTime,
        images,
    });
});
// gets the forward and back links to a page
// for a nice ui page
app.get("/links/:id", async (req, res) => {
    const startTime = Date.now();
    const id = Number.parseInt(req.params.id);
    if (Number.isNaN(id))
        throw ERRORS.BAD_REQUEST(
            "path parameter invalid, insert a valid id number",
        );

    const backlinks = await getBacklinks(dbClient, {
        pageId: id,
    });
    const forwardlinks = await getForwardlinks(dbClient, {
        pageId: id,
    });

    if (backlinks.length + forwardlinks.length <= 0)
        throw ERRORS.NOTFOUND(
            "the page litteraly has no forward or back links, what are you seraching ??, how was it even discovered ? 🤨",
        );
    // if title is null it means it wasn't indexed yet
    res.status(200).json({
        totalTime: Date.now() - startTime,
        backlinks,
        forwardlinks,
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
