import { execFile, execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { useEffect, useRef, useState } from "react";
import { promisify } from "util";

/**
 * Reads directly from the same SQLite file Sharky writes:
 * ~/Library/Application Support/com.sachindabas.sharky/sharky.db
 *
 * Search is retrieval-only. Raycast search extends the in-app matcher with
 * category names and hosts (Saturn's tag/collection equivalent).
 */

export const SHARKY_BUNDLE_ID = "com.sachindabas.sharky";

export const SHARKY_SUPPORT = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  SHARKY_BUNDLE_ID,
);
export const DB_FILE = path.join(SHARKY_SUPPORT, "sharky.db");
export const SCREENSHOTS_DIR = path.join(SHARKY_SUPPORT, "screenshots");

const SQLITE = "/usr/bin/sqlite3";
const RELOAD_DEBOUNCE_MS = 150;

const WATCHED_DB_FILES = new Set([
  "sharky.db",
  "sharky.db-wal",
  "sharky.db-shm",
]);

const execFileAsync = promisify(execFile);

export interface SharkyCategory {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface SharkySticky {
  id: string;
  text: string;
  url: string;
  pageTitle: string | null;
  host: string;
  pattern: string | null;
  categoryId: string | null;
  updatedAt: number;
  isArchived: boolean;
  isPinned: boolean;
  categoryName: string | null;
  categoryColor: string | null;
}

interface RawStickyRow {
  id: string;
  text: string;
  url: string;
  page_title: string | null;
  host: string;
  pattern: string | null;
  category_id: string | null;
  updated_at: number;
  is_archived: number;
  is_pinned: number;
  category_name: string | null;
  category_color: string | null;
}

interface RawCategoryRow {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

const STICKIES_SQL = `
  SELECT
    s.id,
    s.text,
    s.url,
    s.page_title,
    s.host,
    s.pattern,
    s.category_id,
    s.updated_at,
    s.is_archived,
    s.is_pinned,
    c.name AS category_name,
    c.color AS category_color
  FROM stickies s
  LEFT JOIN categories c ON c.id = s.category_id
  ORDER BY s.is_pinned DESC, s.updated_at DESC
`;

const CATEGORIES_SQL = `
  SELECT id, name, color, sort_order
  FROM categories
  ORDER BY sort_order ASC, name ASC
`;

function runJsonQuery<T>(sql: string): T[] {
  const stdout = execFileSync(SQLITE, ["-json", DB_FILE, sql], {
    encoding: "utf-8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const rows = JSON.parse(stdout || "[]") as T[];
  return Array.isArray(rows) ? rows : [];
}

function coerceSticky(row: RawStickyRow): SharkySticky {
  return {
    id: row.id,
    text: row.text ?? "",
    url: row.url,
    pageTitle: row.page_title,
    host: row.host,
    pattern: row.pattern,
    categoryId: row.category_id,
    updatedAt: row.updated_at,
    isArchived: row.is_archived === 1,
    isPinned: row.is_pinned === 1,
    categoryName: row.category_name,
    categoryColor: row.category_color,
  };
}

function coerceCategory(row: RawCategoryRow): SharkyCategory {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
  };
}

/** Never throws — a missing or locked database reads as empty. */
export function readStickies(): SharkySticky[] {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    return runJsonQuery<RawStickyRow>(STICKIES_SQL).map(coerceSticky);
  } catch {
    return [];
  }
}

export function readCategories(): SharkyCategory[] {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    return runJsonQuery<RawCategoryRow>(CATEGORIES_SQL).map(coerceCategory);
  } catch {
    return [];
  }
}

export function sortCategories(categories: SharkyCategory[]): SharkyCategory[] {
  return [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

/** First non-empty line of the note, without basic markdown markers. */
/** Page capture Sharky stores when “page screenshots” is on — `<id>.jpg`. */
export function screenshotPath(stickyId: string): string | null {
  const file = path.join(SCREENSHOTS_DIR, `${stickyId}.jpg`);
  try {
    return fs.existsSync(file) ? file : null;
  } catch {
    return null;
  }
}

export function titleOf(sticky: Pick<SharkySticky, "text">): string {
  const line =
    sticky.text
      .split("\n")
      .map((value) => value.trim())
      .find((value) => value.length > 0) ?? "";
  return line
    .replace(/^(#{1,6}\s+|[-*+]\s+(\[[ xX]\]\s+)?|>\s+|\d+\.\s+)/, "")
    .replace(/[*_`~]/g, "")
    .trim();
}

export function relativeTime(ms: number): string {
  const diffMs = Date.now() - ms;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "just now";
  if (diffMs < hour) {
    const n = Math.floor(diffMs / minute);
    return n === 1 ? "1 minute ago" : `${n} minutes ago`;
  }
  if (diffMs < day) {
    const n = Math.floor(diffMs / hour);
    return n === 1 ? "1 hour ago" : `${n} hours ago`;
  }
  const days = Math.floor(diffMs / day);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months <= 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function absoluteTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function openSharkyApp(): Promise<void> {
  await execFileAsync("open", ["-b", SHARKY_BUNDLE_ID]);
}

export interface SharkyLibrary {
  stickies: SharkySticky[];
  categories: SharkyCategory[];
}

export interface SharkyData extends SharkyLibrary {
  isLoading: boolean;
}

function readAll(): SharkyLibrary {
  return { stickies: readStickies(), categories: readCategories() };
}

/**
 * Live-reads Sharky's database: loads on mount, then reloads when the db file
 * (or its WAL sidecars) change while Raycast stays open.
 */
export function useSharkyLibrary(): SharkyData {
  const [library, setLibrary] = useState<SharkyLibrary>(readAll);
  const [isLoading, setIsLoading] = useState(true);
  const pendingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLibrary(readAll());
    setIsLoading(false);

    let watcher: fs.FSWatcher | null = null;
    try {
      if (!fs.existsSync(SHARKY_SUPPORT)) return undefined;
      watcher = fs.watch(
        SHARKY_SUPPORT,
        { persistent: false },
        (_event, filename) => {
          const name = filename?.toString();
          if (!name || !WATCHED_DB_FILES.has(name)) return;
          pendingRef.current = true;
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            if (!pendingRef.current) return;
            pendingRef.current = false;
            setLibrary(readAll());
          }, RELOAD_DEBOUNCE_MS);
        },
      );
    } catch {
      // Support folder may not exist until Sharky has run once.
    }

    return () => {
      watcher?.close();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { ...library, isLoading };
}

/** @deprecated Use useSharkyLibrary */
export function useSharkyStickies(): Pick<
  SharkyData,
  "stickies" | "isLoading"
> {
  const { stickies, isLoading } = useSharkyLibrary();
  return { stickies, isLoading };
}
