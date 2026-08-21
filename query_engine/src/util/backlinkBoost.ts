// let's say the maximum boost we give is when a page has 1000 backlinks
// that way if a page has 1M backlinks it still gets the same boost as a 1K backlinks page

export function getBacklinkBoost(count: number) {
    const num = Math.max(count, 1000);
    const up = Math.log1p(num); // base e, and 1p means plus 1 so it's count + 1
    const down = Math.log1p(1000);

    const boost = 1 + 0.5 * (up / down); // maximum boost is 1.5

    return boost;
}
