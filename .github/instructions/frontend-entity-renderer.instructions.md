---
applyTo: "frontend/src/core/*/renderer/*Renderer.tsx"
paths:
  - "frontend/src/core/*/renderer/*Renderer.tsx"
---

# Entity Renderer Pattern

Entity renderers display one entity (code, tag, user, project, folder, source document, memo, span/sentence/bbox annotation, ...) as a compact one-line summary that can expand into context. Tables, explorers, dialogs and memos all render entities through them, so every entity looks the same everywhere and callers can pass either an id or already loaded data.

## File Structure

A renderer lives in `core/<domain>/renderer/<Entity>Renderer.tsx`. The folder's `index.ts` exports every file (`export * from "./TagRenderer";`) and the domain `index.ts` exports `./renderer`; other code imports `import { TagRenderer } from "@core/tag"`, files of the same domain import `../renderer`.

```tsx
// 1. Imports
import { ExpandableRenderer, ExpandableRendererProps } from "@components/ExpandableRenderer";
import { TagRead } from "@models/TagRead";
import { Stack, Typography } from "@mui/material";
import { memo } from "react";
import { TagHooks } from "../api/tagHooks";

// 2. Shared props: type alias if nothing is added, interface if it adds render* flags
export interface TagRendererSharedProps extends ExpandableRendererProps {
  renderMemoIndicator?: boolean;
}

// 3. Main props: the entity as id or Read DTO
interface TagRendererProps extends TagRendererSharedProps {
  tag: number | TagRead;
}

// 4. Dispatcher (the only exported component)
export const TagRenderer = memo(({ tag, ...props }: TagRendererProps) => {
  if (typeof tag === "number") {
    return <TagRendererWithoutData tagId={tag} {...props} />;
  } else {
    return <TagRendererWithData tag={tag} {...props} />;
  }
});

// 5. WithoutData: fetches by id
const TagRendererWithoutData = memo(({ tagId, ...props }: { tagId: number } & TagRendererSharedProps) => {
  const tag = TagHooks.useGetTag(tagId);

  if (tag.isSuccess) {
    return <TagRendererWithData tag={tag.data} {...props} />;
  } else if (tag.isError) {
    return <div>{tag.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
});

// 6. WithData: the summary row
const TagRendererWithData = memo(
  ({ tag, renderMemoIndicator, ...expandProps }: { tag: TagRead } & TagRendererSharedProps) => {
    return (
      <ExpandableRenderer {...expandProps} expandedContent={<TagContext tag={tag} />}>
        <Stack direction="row" alignItems="center" minWidth={0} maxWidth="100%" overflow="hidden">
          {/* icon (flexShrink: 0), name, optional parts behind render* flags */}
        </Stack>
      </ExpandableRenderer>
    );
  },
);

// 7. Context: the expanded content
function TagContext({ tag }: { tag: TagRead }) {
  return (
    <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {tag.description || "No description available."}
    </Typography>
  );
}
```

## Rules

### Props

- **Entity input**: the main prop is named after the entity and typed `number | XRead` (`tag`, `sdoc`, `spanAnnotation`, `project`). Never a separate `xId` prop next to an `x` prop. Extra identifying props sit next to it (`folderType`, `sentenceId`).
- **Shared props**: `export type XRendererSharedProps = ExpandableRendererProps;` when nothing is added, otherwise `export interface XRendererSharedProps extends ExpandableRendererProps { ... }`. `WithoutData` and `WithData` take `{ xId: number } & XRendererSharedProps` / `{ x: XRead } & XRendererSharedProps` inline.
- **Visibility flags** are optional booleans with the `render` prefix: `renderName`, `renderIcon`, `renderDoctypeIcon`, `renderMemoIndicator`, `renderCode`, `renderText`. Never `show*`. Navigation is `link?: boolean` (wraps the summary in `LinkWrapper`).
- **No styling props**: no `stackProps`, `sx`, `truncate`. Style from the parent.

### Components

- **memo everywhere**: the dispatcher, `WithoutData` and `WithData` are `const X = memo(...)`; `Context` is a plain `function`.
- **Naming and order**: `XRenderer` → `XRendererWithoutData` → `XRendererWithData` → `XContext`.
- **Exports**: only the dispatcher and `XRendererSharedProps`. Export `XRendererWithData` only when a caller has the data but not the id (`SdocMetadataRendererWithData`).
- **Data**: `WithoutData` loads with the domain hook (`TagHooks.useGetTag(id)`) or, if there is none, `useQuery(xQueries.byId(id))`.
- **States**: `WithoutData` uses exactly the `isSuccess` / `isError` → `<div>{error.message}</div>` / `<div>Loading...</div>` chain from the skeleton.

### Summary (WithData)

- Wrap in `ExpandableRenderer` and spread the remaining expand props into it: `{...expandProps}`.
- Container: `Stack direction="row" alignItems="center" minWidth={0} maxWidth="100%" overflow="hidden"` (add `spacing` if needed).
- Text: `Typography component="span" noWrap minWidth={0}`. Icons: `getIconComponent(Icon.X, { style: { flexShrink: 0 } })`.
- Memo indicator: `{renderMemoIndicator && x.memo_ids && x.memo_ids.length > 0 && <MemoIndicator ... />}`.

### Context

- Plain text: `Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}` with a fallback (`"No description available."`).
- Context that loads data: `CircularProgress size={20}` while loading, `Typography color="error"` on error.
- Sentence lists: `Stack component="ol" spacing={1} sx={{ my: 0, pl: 3 }}` with one `Typography component="li"` per sentence.

### Variations

- **Annotation renderers** (span, sentence, bbox) use `AnnotationRendererSharedProps` from `@core/annotation`. `WithData` destructures `expandable`, `expandMaxHeight`, `expandButtonPosition` explicitly, passes them to `ExpandableRenderer`, and spreads the rest into `AnnotationSummaryRow`.
- **List renderers** (`SdocTagsRenderer`, `SdocAnnotatorsRenderer`) take `sdocId?` or the list, render the entity renderer per item, and show `Nothing to show :(` when both are missing. They do not use `ExpandableRenderer`.
- **Composite renderers** combine other renderers or values without their own `ExpandableRenderer`: `SdocFolderRenderer` (picks `FolderRenderer` or `FolderRootRenderer`), `SdocMetadataRenderer` (value by meta type), `AttachedObjectRenderer` (switch over `AttachedObjectType`). They still use `memo` and the same loading/error output.

### Enforced by ESLint

- `local/entity-renderer-location`: a file that uses `ExpandableRenderer` must be `src/core/<domain>/renderer/<Name>Renderer.tsx`.
- `local/entity-renderer-conventions`: `*Renderer`, `*RendererWithData`, `*RendererWithoutData` are `memo(...)`; prop names starting with `show` are errors.

## Examples

See:

- [TagRenderer.tsx](../../frontend/src/core/tag/renderer/TagRenderer.tsx) — canonical renderer with memo indicator
- [SdocRenderer.tsx](../../frontend/src/core/source-document/renderer/SdocRenderer.tsx) — `link`, several `render*` flags, context that loads data
- [SpanAnnotationRenderer.tsx](../../frontend/src/core/span-annotation/renderer/SpanAnnotationRenderer.tsx) — annotation variation with `AnnotationSummaryRow`
