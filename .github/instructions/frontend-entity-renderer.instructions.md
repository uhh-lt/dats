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

- **Entity input**: the main prop is named after the entity and typed `number | XRead` (`tag`, `sdoc`, `spanAnnotation`, `project`). Never a separate `xId` prop next to an `x` prop. Extra identifying props sit next to it (`folderType`, `sentenceId`). An entity identified by two ids takes a union of both ids or both DTOs (`SdocMetadataRenderer`: `{ sdocId, projectMetadataId } | { sdocMetadata, projectMetadata }`) and dispatches with `"sdocId" in props`.
- **Shared props**: `export type XRendererSharedProps = ExpandableRendererProps;` when nothing is added, otherwise `export interface XRendererSharedProps extends ExpandableRendererProps { ... }`. `WithoutData` and `WithData` take `{ xId: number } & XRendererSharedProps` / `{ x: XRead } & XRendererSharedProps` inline.
- **Visibility flags** are optional booleans with the `render` prefix: `renderName`, `renderIcon`, `renderDoctypeIcon`, `renderMemoIndicator`, `renderCode`, `renderText`. Never `show*`. Navigation is `link?: boolean` (wraps the summary in `LinkWrapper`).
- **No styling props**: no `stackProps`, `sx`, `truncate`. Style from the parent.

### Components

- **memo everywhere**: the dispatcher, `WithoutData` and `WithData` are `const X = memo(...)`; `Context` is a plain `function`.
- **Naming and order**: `XRenderer` → `XRendererWithoutData` → `XRendererWithData` → `XContext`.
- **Exports**: only the dispatcher and `XRendererSharedProps` (lint). `WithoutData`, `WithData` and `Context` stay private; a caller that already has the data passes the Read DTO to the dispatcher.
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

### Kinds of renderers

All kinds follow the rules above (`memo`, the loading/error output, only the dispatcher exported, the input as id or Read DTO).

| Kind       | Renderers                                                                                 | `ExpandableRenderer`                                              |
| ---------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Entity     | tag, code, sdoc, memo, folder, user, project, span / sentence / bbox annotation           | its own, around the summary                                       |
| Delegating | `SdocFolderRenderer` (folder or root), `AttachedObjectRenderer` (by `AttachedObjectType`) | none of its own; passes the expand props to the renderer it picks |
| List       | `SdocTagsRenderer`, `SdocAnnotatorsRenderer`                                              | none; one entity renderer per item                                |
| Value      | `SdocMetadataRenderer`                                                                    | none (a value has no context)                                     |

- **Annotation renderers** (span, sentence, bbox) are entity renderers whose summary is the shared `AnnotationSummaryRow` from `@core/annotation`, with `AnnotationRendererSharedProps`. `WithData` names the summary flags, passes them to `AnnotationSummaryRow` and spreads the expand props into `ExpandableRenderer`, like every other entity renderer. The link takes the project from the route params, so annotation renderers are only used inside a project page.
- **List renderers** take `{ sdocId } | { tagIds }` (`{ annotators }`): loaded by the document or given as ids.
- **`AttachedObjectRenderer`** takes the memo's reference, `attachedObjectType` and `attachedObjectId`, and renders the matching entity renderer by id.

### Enforced by ESLint

- `local/entity-renderer-location`: a file that uses `ExpandableRenderer` must be `src/core/<domain>/renderer/<Name>Renderer.tsx`.
- `local/entity-renderer-conventions`: `*Renderer`, `*RendererWithData`, `*RendererWithoutData` are `memo(...)`; a renderer file exports no component but its dispatcher; prop names starting with `show` are errors.

## Examples

See:

- [TagRenderer.tsx](../../frontend/src/core/tag/renderer/TagRenderer.tsx) — canonical renderer with memo indicator
- [SdocRenderer.tsx](../../frontend/src/core/source-document/renderer/SdocRenderer.tsx) — `link`, several `render*` flags, context that loads data
- [SpanAnnotationRenderer.tsx](../../frontend/src/core/span-annotation/renderer/SpanAnnotationRenderer.tsx) — annotation variation with `AnnotationSummaryRow`
