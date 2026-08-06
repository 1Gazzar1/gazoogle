import express, { ErrorRequestHandler } from "express";
import { CustomError } from "@/errors/error.js";
import { loadEnvFile } from "node:process";
import helmet from "helmet";
import { cleanQuery } from "@/util/cleanQuery.js";
import { doLevenshtein } from "@/util/levenshtein.js";
import { getAllVocab } from "@/internal/vocab_sql.js";
import { initDb } from "@/db/db.js";
import { getPagesBytWords } from "@/internal/retreival_sql.js";
import { BM25Params, getBM25 } from "@/util/bm25.js";
import { getDocInfo } from "@/internal/metadata_sql.js";

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

    const vocabTable = await getAllVocab(dbClient);
    const vocabStems: Record<string, string> = {};
    vocabTable.forEach((row) => {
        vocabStems[row.word] = row.stem;
    });

    let corrected = false;

    console.log(qWords);
    const finalQuery = qWords.map((word) => {
        const closest = doLevenshtein(word, Object.keys(vocabStems));
        if (word !== closest) {
            corrected = true;
            return closest;
        }
        return word;
    });
    const stems = finalQuery.map((q) => vocabStems[q]);
    // this gets a JOIN of 3 tables ( postings, terms and pages ) to gather all data to calc bm25
    const data = await getPagesBytWords(dbClient, {
        words: stems,
    });

    const docsInfo = await getDocInfo(dbClient);

    type Page = {
        pageId: number;
        url: string;
        heading: string;
        title: string;
        score: number;
    };
    const resultsMap: Record<string, Page> = {};
    for (const row of data) {
        const params: BM25Params = {
            avgDocLen: docsInfo?.avgDocLength ?? 0,
            totalDocs: docsInfo?.totalDocuments ?? 0,
            b: 0.7,
            k1: 1.2,
            df: row.df,
            docLen: row.docLength ?? 0,
            tf: row.tf,
        };
        const score = getBM25(params);

        if (!resultsMap[row.url]) {
            resultsMap[row.url].score += score;
            continue;
        }
        resultsMap[row.url] = {
            ...resultsMap[row.url],
            score: resultsMap[row.url].score + score,
        };
    }
    const results = Object.values(resultsMap);
    results.sort((a, b) => b.score - a.score);

    res.json({
        corrected,
        q: finalQuery,
        results: results.slice(0, 10),
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
