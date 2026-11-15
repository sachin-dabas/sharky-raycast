import { Icon, LaunchProps, List } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useMemo, useState } from "react";
import { searchStickies } from "./lib/search";
import { StickyListItem } from "./lib/sticky-item";
import { useSharkyLibrary } from "./lib/sharky";

export default function SearchNotes({
  arguments: launchArgs,
}: LaunchProps<{ arguments: { query?: string } }>) {
  const { stickies, categories, isLoading } = useSharkyLibrary();
  const [searchText, setSearchText] = useState(launchArgs?.query ?? "");

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories],
  );

  const active = useMemo(
    () => stickies.filter((s) => !s.isArchived),
    [stickies],
  );

  const { data: rankedStickies, visitItem } = useFrecencySorting(active, {
    key: (s) => s.id,
  });

  const frecencyRank = useMemo(
    () => new Map(rankedStickies.map((s, i) => [s.id, i] as const)),
    [rankedStickies],
  );

  const query = searchText.trim();
  const results = useMemo(
    () =>
      query ? searchStickies(rankedStickies, searchText, { frecencyRank }) : [],
    [query, rankedStickies, searchText, frecencyRank],
  );

  if (!isLoading && active.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No notes yet"
          description="Sharky saves stickies to pages you visit. Create one in Sharky, then search it here."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      isShowingDetail={results.length > 0}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search notes, types, URLs, and sites…"
    >
      {!query ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search your stickies"
          description="Matches note text, page titles, URLs, sites, and types (like Saturn's tags)."
        />
      ) : results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matches"
          description="Try different words, or check Archive in Sharky."
        />
      ) : (
        results.map((result) => (
          <StickyListItem
            key={result.sticky.id}
            sticky={result.sticky}
            category={
              result.sticky.categoryId
                ? categoryById.get(result.sticky.categoryId)
                : undefined
            }
            match={result}
            onVisit={visitItem}
          />
        ))
      )}
    </List>
  );
}
