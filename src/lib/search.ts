/**
 * Search over Sharky stickies — word matching like the app, plus category and
 * host (the Raycast analogue of Saturn's tags + domains). Pure functions for fixtures.
 */

import type { SharkySticky } from "./sharky";
import { titleOf } from "./sharky";

export const MAX_RESULTS = 100;
const SNIPPET_RADIUS = 60;
const SNIPPET_WINDOW = 150;

export function searchTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** All fields Raycast searches: note, page, URL, pattern, host, and type name. */
export function searchHaystack(sticky: SharkySticky): string {
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

export function matchesSearch(
  sticky: SharkySticky,
  terms: readonly string[],
): boolean {
  if (terms.length === 0) return true;
  const haystack = searchHaystack(sticky);
  return terms.every((term) => haystack.includes(term));
}

export interface MatchedFields {
  title: string[];
  category: string[];
  body: string[];
  url: string[];
}

export interface SearchResult {
  sticky: SharkySticky;
  /** 0 = title, page title, or type; 1 = note body / URL / host only. */
  bucket: 0 | 1;
  matched: MatchedFields;
  snippet?: string;
}

function primaryHaystack(sticky: SharkySticky): string {
  return `${titleOf(sticky)}\n${sticky.pageTitle ?? ""}\n${sticky.categoryName ?? ""}`.toLowerCase();
}

function fieldMatch(haystack: string, terms: readonly string[]): string[] {
  return terms.filter((term) => haystack.includes(term));
}

export function buildSnippet(
  text: string,
  terms: string[],
): string | undefined {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat || terms.length === 0) return undefined;
  const lower = flat.toLowerCase();
  let anchor = -1;
  for (const term of terms) {
    const i = lower.indexOf(term.toLowerCase());
    if (i !== -1 && (anchor === -1 || i < anchor)) anchor = i;
  }
  if (anchor === -1)
    return flat.length <= SNIPPET_WINDOW
      ? flat
      : `${flat.slice(0, SNIPPET_WINDOW)}…`;

  let start = Math.max(0, anchor - SNIPPET_RADIUS);
  let end = Math.min(flat.length, start + SNIPPET_WINDOW);
  if (start > 0) {
    const space = flat.indexOf(" ", start);
    if (space !== -1 && space < anchor) start = space + 1;
  }
  if (end < flat.length) {
    const space = flat.lastIndexOf(" ", end);
    if (space > start) end = space;
  }
  return (
    (start > 0 ? "…" : "") +
    flat.slice(start, end) +
    (end < flat.length ? "…" : "")
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeMarkdown(s: string): string {
  return s.replace(/[\\`*_[\]]/g, "\\$&");
}

export function boldTerms(text: string, terms: string[]): string {
  const escaped = escapeMarkdown(text);
  const uniq = [...new Set(terms.filter((t) => t.length > 0))].sort(
    (a, b) => b.length - a.length,
  );
  if (uniq.length === 0) return escaped;
  const re = new RegExp(`(${uniq.map(escapeRegExp).join("|")})`, "giu");
  return escaped.replace(re, "**$1**");
}

function fileUrlFor(filePath: string): string {
  return `file://${encodeURI(filePath)}`;
}

/** Detail body: page screenshot (like Saturn’s thumbnail) then snippet or note preview. */
export function buildDetailMarkdown(
  result: Pick<SearchResult, "sticky" | "matched" | "snippet">,
  pageScreenshotPath?: string | null,
): string {
  const parts: string[] = [];
  if (pageScreenshotPath) {
    parts.push(`![](${fileUrlFor(pageScreenshotPath)}?raycast-height=280)`);
  }

  const { sticky, matched, snippet } = result;
  if (snippet) {
    parts.push(boldTerms(snippet, [...matched.body, ...matched.url]));
  } else {
    const flat = sticky.text.replace(/\s+/g, " ").trim();
    if (flat) {
      const preview = flat.length <= 280 ? flat : `${flat.slice(0, 277)}…`;
      parts.push(
        boldTerms(preview, [
          ...matched.title,
          ...matched.body,
          ...matched.category,
        ]),
      );
    } else if (parts.length === 0) {
      parts.push("_Empty note_");
    }
  }

  return parts.join("\n\n");
}

export function searchStickies(
  stickies: readonly SharkySticky[],
  query: string,
  options?: { includeArchived?: boolean; frecencyRank?: Map<string, number> },
): SearchResult[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return [];

  const includeArchived = options?.includeArchived ?? false;
  const rank = options?.frecencyRank;
  const results: SearchResult[] = [];
  const bodyHaystack = (sticky: SharkySticky) => sticky.text.toLowerCase();
  const urlHaystack = (sticky: SharkySticky) =>
    `${sticky.url}\n${sticky.host}\n${sticky.pattern ?? ""}`.toLowerCase();

  for (const sticky of stickies) {
    if (!includeArchived && sticky.isArchived) continue;
    if (!matchesSearch(sticky, terms)) continue;

    const primary = primaryHaystack(sticky);
    const matched: MatchedFields = {
      title: fieldMatch(
        `${titleOf(sticky)}\n${sticky.pageTitle ?? ""}`.toLowerCase(),
        terms,
      ),
      category: fieldMatch((sticky.categoryName ?? "").toLowerCase(), terms),
      body: fieldMatch(bodyHaystack(sticky), terms),
      url: fieldMatch(urlHaystack(sticky), terms),
    };

    const inPrimary = terms.every((term) => primary.includes(term));
    const bucket: 0 | 1 = inPrimary ? 0 : 1;
    const bodyTerms = [...new Set([...matched.body, ...matched.url])];
    const snippet =
      bucket === 1 && bodyTerms.length > 0
        ? buildSnippet(sticky.text, bodyTerms)
        : undefined;

    results.push({ sticky, bucket, matched, snippet });
  }

  results.sort(
    (a, b) =>
      a.bucket - b.bucket ||
      Number(b.sticky.isPinned) - Number(a.sticky.isPinned) ||
      b.sticky.updatedAt - a.sticky.updatedAt ||
      (rank?.get(a.sticky.id) ?? Number.MAX_SAFE_INTEGER) -
        (rank?.get(b.sticky.id) ?? Number.MAX_SAFE_INTEGER),
  );

  return results.slice(0, MAX_RESULTS);
}

/** Filter stickies already scoped to a type — still uses full-field matching. */
export function searchStickiesInList(
  stickies: readonly SharkySticky[],
  query: string,
  options?: { frecencyRank?: Map<string, number> },
): SearchResult[] {
  return searchStickies(stickies, query, { includeArchived: true, ...options });
}
