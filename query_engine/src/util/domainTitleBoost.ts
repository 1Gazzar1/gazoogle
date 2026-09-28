import { normalizeQuery } from "@/util/cleanQuery.js";

type resultType = {
    id: number;
    url?: string | undefined;
    heading?: string | null | undefined;
    title?: string | null | undefined;
    backlinkCount?: number | undefined;
    backlinkBoost?: number | undefined;
    rrfScore: number;
    type: "bm25" | "embedding" | "both";
};

export function getDomainTitleBoost(q: string[], page: resultType) {
    // we apply a boost if the page has the query words in thier domain,title or heading
    // these boosts are only applied once per property
    // domain:  x4
    // title:   x2
    // heading: x1.5
    let boost = 1;
    let domainF = false;
    let titleF = false;
    let headingF = false;

    const u = URL.parse(page.url!);
    const domainWords = new Set(u ? normalizeQuery(u.hostname) : []);
    const titleWords = new Set(page.title ? normalizeQuery(page.title) : []);
    const headingWords = new Set(
        page.heading ? normalizeQuery(page.heading) : [],
    );

    q.forEach((word) => {
        if (!domainF && domainWords.has(word)) {
            boost = boost * 4;
            domainF = true;
        }
        if (!titleF && titleWords.has(word)) {
            boost = boost * 2;
            titleF = true;
        }
        if (!headingF && headingWords.has(word)) {
            boost = boost * 1.5;
            headingF = true;
        }
    });
    return boost;
}
