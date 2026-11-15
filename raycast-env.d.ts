/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-notes` command */
  export type SearchNotes = ExtensionPreferences & {}
  /** Preferences accessible in the `browse-types` command */
  export type BrowseTypes = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-notes` command */
  export type SearchNotes = {
  /** Search query */
  "query": string
}
  /** Arguments passed to the `browse-types` command */
  export type BrowseTypes = {}
}

