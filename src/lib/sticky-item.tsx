import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import {
  absoluteTime,
  openSharkyApp,
  relativeTime,
  screenshotPath,
  SharkyCategory,
  SharkySticky,
  titleOf,
} from "./sharky";
import { buildDetailMarkdown, SearchResult } from "./search";

const CATEGORY_COLORS: Record<string, Color> = {
  yellow: Color.Yellow,
  blue: Color.Blue,
  green: Color.Green,
  pink: Color.Magenta,
  purple: Color.Purple,
  gray: Color.SecondaryText,
};

export function stickyListIcon(sticky: SharkySticky): Image.ImageLike {
  try {
    return getFavicon(sticky.url, {
      fallback: Icon.Document,
      mask: Image.Mask.RoundedRectangle,
    });
  } catch {
    return Icon.Document;
  }
}

function tagColor(name: string): Color {
  const colors = [
    Color.Blue,
    Color.Green,
    Color.Orange,
    Color.Purple,
    Color.Red,
    Color.Magenta,
    Color.Yellow,
  ] as const;
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

interface StickyListItemProps {
  sticky: SharkySticky;
  category?: SharkyCategory;
  typeStickies?: SharkySticky[];
  match?: SearchResult;
  onVisit?: (sticky: SharkySticky) => void;
}

export function StickyListItem({
  sticky,
  category,
  typeStickies,
  match,
  onVisit,
}: StickyListItemProps) {
  const title =
    titleOf(sticky) || sticky.pageTitle || sticky.host || sticky.url;
  const bodyOnlyMatch = match?.bucket === 1 && match.snippet;
  const accessories: List.Item.Accessory[] = [];
  if (sticky.isPinned) {
    accessories.push({ icon: Icon.Pin, tooltip: "Pinned" });
  }
  if (sticky.isArchived) {
    accessories.push({ text: "Archived", tooltip: "Archived in Sharky" });
  } else if (bodyOnlyMatch) {
    accessories.push({
      text: { value: "in note", color: Color.SecondaryText },
      tooltip: "Matched in the note or URL, not the title or type",
    });
  }

  const categoryColor =
    (sticky.categoryColor && CATEGORY_COLORS[sticky.categoryColor]) ??
    tagColor(category?.name ?? "");

  const pageShot = screenshotPath(sticky.id);

  return (
    <List.Item
      id={sticky.id}
      icon={stickyListIcon(sticky)}
      title={title}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={buildDetailMarkdown(
            match ?? {
              sticky,
              matched: { title: [], category: [], body: [], url: [] },
            },
            pageShot,
          )}
          metadata={
            <List.Item.Detail.Metadata>
              {(sticky.categoryName || category) && (
                <List.Item.Detail.Metadata.TagList title="Type">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={sticky.categoryName ?? category?.name ?? "Untyped"}
                    color={categoryColor}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.Link
                title="Page"
                text={sticky.host}
                target={sticky.url}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Updated"
                text={relativeTime(sticky.updatedAt)}
              />
              <List.Item.Detail.Metadata.Label
                title="Updated (exact)"
                text={absoluteTime(sticky.updatedAt)}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={sticky.url}
            onOpen={() => onVisit?.(sticky)}
          />
          <Action
            title="Open Sharky"
            icon={Icon.AppWindow}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
            onAction={async () => {
              try {
                await openSharkyApp();
              } catch {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Couldn't open Sharky",
                  message: "Install Sharky and open it at least once.",
                });
              }
            }}
          />
          <Action.CopyToClipboard
            title="Copy Note"
            content={sticky.text}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onCopy={() => onVisit?.(sticky)}
          />
          <Action.CopyToClipboard
            title="Copy Page URL"
            content={sticky.url}
            onCopy={() => onVisit?.(sticky)}
          />
          <Action
            title="Copy Note and Open Page"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onAction={async () => {
              await Clipboard.copy(sticky.text);
              await open(sticky.url);
              onVisit?.(sticky);
            }}
          />
          {typeStickies && typeStickies.length > 1 && category && (
            <Action
              title={`Open All ${typeStickies.length} Pages in ${category.name}`}
              icon={Icon.AppWindowGrid3x3}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
              onAction={async () => {
                await showToast({
                  style: Toast.Style.Animated,
                  title: `Opening ${typeStickies.length} pages…`,
                });
                for (const item of typeStickies) {
                  await open(item.url);
                  onVisit?.(item);
                }
                await showToast({
                  style: Toast.Style.Success,
                  title: `Opened ${typeStickies.length} pages`,
                  message: category.name,
                });
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
