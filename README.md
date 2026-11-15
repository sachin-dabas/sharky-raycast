# Sharky

Companion Raycast extension for the [Sharky](https://github.com/sachin-dabas/sharky) macOS app.

Search stickies from anywhere: note text, page titles, and URLs — the same matching rules as Sharky’s library (⌘F).

Source: [github.com/sachin-dabas/sharky-raycast](https://github.com/sachin-dabas/sharky-raycast) (sibling to the app repo, like [saturn-raycast](https://github.com/sachin-dabas/saturn-raycast)).

## Requirements

- **Sharky** installed and launched at least once (creates the app support folder and `sharky.db`)
- **macOS** with Raycast

No API keys or extension preferences.

## Commands

- **Search Notes** — search note text, page titles, URLs, sites, and types (Sharky’s category names — the Saturn tag equivalent). Title/type hits sort above body-only matches, with a one-line **in note** snippet when the match is in the text or URL. **Enter** opens the page. Assign a global hotkey in **Raycast Settings → Shortcuts**.
- **Browse Types** — pick a type, then search within that list (same matching rules as **Search Notes**).

## Hotkeys

1. Open **Raycast Settings → Shortcuts** (or select the command and press **⌘,** → **Set Hotkey**).
2. Find **Sharky → Search Notes**.
3. Record a shortcut (e.g. **⌥⌘Y**).

## How it works

The extension reads Sharky’s SQLite database (read-only):

`~/Library/Application Support/com.sachindabas.sharky/sharky.db`

It reloads when that file changes while the command is open. It does not write to the database.

## Publishing

| Repo | What goes there |
| --- | --- |
| [sharky-raycast](https://github.com/sachin-dabas/sharky-raycast) (this repo) | Raycast extension source — push here, then `npm run publish` for the Raycast Store |
| [sharky-releases](https://github.com/sachin-dabas/sharky-releases) | Signed **app** builds and the in-app updater manifest only (`npm run release` from the Sharky app repo) |

## Develop

```bash
npm install
npm run dev
```

Run tests:

```bash
npm test
```

Publish to the Raycast Store (from a clean checkout of this repo):

```bash
npm run publish
```