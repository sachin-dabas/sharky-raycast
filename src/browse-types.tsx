import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useMemo } from "react";
import { TypeNotesView } from "./lib/type-view";
import {
  SharkyCategory,
  SharkySticky,
  sortCategories,
  useSharkyLibrary,
} from "./lib/sharky";

const CATEGORY_COLORS: Record<string, Color> = {
  yellow: Color.Yellow,
  blue: Color.Blue,
  green: Color.Green,
  pink: Color.Magenta,
  purple: Color.Purple,
  gray: Color.SecondaryText,
};

function typeIcon(category: SharkyCategory): {
  source: Icon;
  tintColor?: Color;
} {
  const tint = CATEGORY_COLORS[category.color] ?? Color.SecondaryText;
  return { source: Icon.Tag, tintColor: tint };
}

export default function BrowseTypes() {
  const { stickies, categories, isLoading } = useSharkyLibrary();

  const ordered = useMemo(() => sortCategories(categories), [categories]);
  const active = useMemo(
    () => stickies.filter((s) => !s.isArchived),
    [stickies],
  );

  const { data: rankedStickies, visitItem } = useFrecencySorting(active, {
    key: (s) => s.id,
  });

  const stickiesByType = useMemo(() => {
    const map = new Map<string, SharkySticky[]>();
    const untyped: SharkySticky[] = [];
    for (const sticky of rankedStickies) {
      if (!sticky.categoryId) {
        untyped.push(sticky);
        continue;
      }
      const bucket = map.get(sticky.categoryId) ?? [];
      bucket.push(sticky);
      map.set(sticky.categoryId, bucket);
    }
    return { map, untyped };
  }, [rankedStickies]);

  if (!isLoading && categories.length === 0 && active.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Tag}
          title="No notes yet"
          description="Open Sharky and leave a sticky on a page, then browse by type here."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search types">
      {ordered.map((category) => {
        const notes = stickiesByType.map.get(category.id) ?? [];
        return (
          <List.Item
            key={category.id}
            icon={typeIcon(category)}
            title={category.name}
            accessories={[
              { text: `${notes.length}`, tooltip: "Notes with this type" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Notes"
                  icon={Icon.List}
                  target={
                    <TypeNotesView
                      category={category}
                      stickies={notes}
                      isLoading={isLoading}
                      onVisitSticky={visitItem}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
      {stickiesByType.untyped.length > 0 ? (
        <List.Item
          key="untyped"
          icon={{ source: Icon.Document, tintColor: Color.SecondaryText }}
          title="Untyped"
          accessories={[{ text: `${stickiesByType.untyped.length}` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Notes"
                icon={Icon.List}
                target={
                  <TypeNotesView
                    category={{
                      id: "",
                      name: "Untyped",
                      color: "gray",
                      sortOrder: 999,
                    }}
                    stickies={stickiesByType.untyped}
                    isLoading={isLoading}
                    onVisitSticky={visitItem}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
