import { List } from "@raycast/api";
import { useMemo, useState } from "react";
import { searchStickiesInList } from "./search";
import { StickyListItem } from "./sticky-item";
import { SharkyCategory, SharkySticky } from "./sharky";

interface TypeNotesViewProps {
  category: SharkyCategory;
  stickies: SharkySticky[];
  isLoading?: boolean;
  onVisitSticky?: (sticky: SharkySticky) => void;
}

/** Notes under one Sharky type — pushed from Browse Types. */
export function TypeNotesView({
  category,
  stickies,
  isLoading,
  onVisitSticky,
}: TypeNotesViewProps) {
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();

  const results = useMemo(
    () => (query ? searchStickiesInList(stickies, searchText) : []),
    [query, searchText, stickies],
  );

  return (
    <List
      navigationTitle={category.name}
      isLoading={isLoading}
      filtering={false}
      isShowingDetail={(query ? results : stickies).length > 0}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search in ${category.name}…`}
    >
      {query ? (
        results.length === 0 ? (
          <List.EmptyView
            title="No matches"
            description="Try different words."
          />
        ) : (
          results.map((result) => (
            <StickyListItem
              key={result.sticky.id}
              sticky={result.sticky}
              category={category}
              typeStickies={stickies}
              match={result}
              onVisit={onVisitSticky}
            />
          ))
        )
      ) : stickies.length === 0 ? (
        <List.EmptyView
          title="No notes yet"
          description={`Nothing typed as “${category.name}” yet — pick this type in Sharky when you edit a note.`}
        />
      ) : (
        stickies.map((sticky) => (
          <StickyListItem
            key={sticky.id}
            sticky={sticky}
            category={category}
            typeStickies={stickies}
            onVisit={onVisitSticky}
          />
        ))
      )}
    </List>
  );
}
