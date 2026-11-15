import assert from "node:assert/strict";

function searchTerms(query) {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function searchHaystack(sticky) {
  return [
    sticky.text,
    sticky.pageTitle ?? "",
    sticky.url,
    sticky.pattern ?? "",
    sticky.host,
    sticky.categoryName ?? "",
  ]
    .join("\n")
    .toLowerCase();
}

function matchesSearch(sticky, terms) {
  if (terms.length === 0) return true;
  const haystack = searchHaystack(sticky);
  return terms.every((term) => haystack.includes(term));
}

const sample = {
  text: "Fix the Raycast search command",
  pageTitle: "Sharky README",
  url: "https://example.com/docs",
  pattern: null,
  host: "example.com",
  categoryName: "Research",
};

assert.deepEqual(searchTerms("  Fix   Raycast "), ["fix", "raycast"]);
assert.equal(matchesSearch(sample, searchTerms("raycast search")), true);
assert.equal(matchesSearch(sample, searchTerms("example docs")), true);
assert.equal(matchesSearch(sample, searchTerms("research")), true);
assert.equal(matchesSearch(sample, searchTerms("missing")), false);

console.log("search-fixtures: ok");