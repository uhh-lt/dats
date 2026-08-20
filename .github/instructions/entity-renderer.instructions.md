---
applyTo: "frontend/src/**/*Renderer.tsx"
---

# Entity Renderer Pattern

Entity renderers are components that display a single entity (Code, Tag, Project, Memo, Annotation, etc.) in a consistent, compact format. They follow a strict structural pattern for consistency and maintainability.

## File Structure

Every renderer file must follow this exact order:

```tsx
// 1. Imports
import { EntityHooks } from "@api/hooks/EntityHooks";
import { ExpandableRenderer, ExpandableRendererProps } from "@components/ExpandableRenderer";
import { EntityRead } from "@models/EntityRead";
import { Stack, Typography } from "@mui/material";
import { memo } from "react";

// 2. Shared props type (use type alias if empty, interface if extending)
export type EntityRendererSharedProps = ExpandableRendererProps;
// OR: export interface EntityRendererSharedProps extends ExpandableRendererProps { ... }

// 3. Main props interface
interface EntityRendererProps extends EntityRendererSharedProps {
  entity: number | EntityRead;
}

// 4. Main exported component (dispatcher)
export const EntityRenderer = memo(({ entity, ...props }: EntityRendererProps) => {
  if (typeof entity === "number") {
    return <EntityRendererWithoutData entityId={entity} {...props} />;
  } else {
    return <EntityRendererWithData entity={entity} {...props} />;
  }
});

// 5. WithoutData component (fetches by ID)
const EntityRendererWithoutData = memo(({ entityId, ...props }: { entityId: number } & EntityRendererSharedProps) => {
  const entity = EntityHooks.useGetEntity(entityId);

  if (entity.isSuccess) {
    return <EntityRendererWithData entity={entity.data} {...props} />;
  } else if (entity.isError) {
    return <div>{entity.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
});

// 6. WithData component (presentational)
const EntityRendererWithData = memo(
  ({ entity, ...expandProps }: { entity: EntityRead } & EntityRendererSharedProps) => {
    return (
      <ExpandableRenderer {...expandProps} expandedContent={<EntityContext entity={entity} />}>
        <Stack direction="row" alignItems="center" minWidth={0} maxWidth="100%" overflow="hidden">
          {/* icon, name, etc. */}
        </Stack>
      </ExpandableRenderer>
    );
  },
);

// 7. Context component (expanded content)
function EntityContext({ entity }: { entity: EntityRead }) {
  return (
    <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {entity.description || "No description available."}
    </Typography>
  );
}
```

## Rules

### Props

- **Shared props**: Use `export type XRendererSharedProps = ExpandableRendererProps;` when no additional props are needed. Use `export interface XRendererSharedProps extends ExpandableRendererProps { ... }` only when adding new props.
- **Main props**: Always `interface XRendererProps extends XRendererSharedProps { entity: number | EntityRead; }`
- **No extra props**: Do not add `stackProps`, `truncate`, or other one-off props. If styling is needed, wrap the renderer in a parent component.

### Components

- **All components use `memo`**: The dispatcher, `WithoutData`, and `WithData` must all be wrapped in `React.memo`.
- **Naming**: `XRenderer` → `XRendererWithoutData` → `XRendererWithData` → `XContext`
- **Order**: Dispatcher first, then `WithoutData`, then `WithData`, then `Context` at the bottom.

### State handling (WithoutData)

Always use this exact pattern:

```tsx
if (query.isSuccess) {
  return <XRendererWithData entity={query.data} {...props} />;
} else if (query.isError) {
  return <div>{query.error.message}</div>;
} else {
  return <div>Loading...</div>;
}
```

### Summary content (WithData)

- Always wrap in `ExpandableRenderer` with `expandedContent={<XContext ... />}`
- Use `Stack direction="row" alignItems="center" minWidth={0} maxWidth="100%" overflow="hidden"` as the container
- Use `Typography component="span" noWrap minWidth={0}` for text
- Icons use `flexShrink: 0` to prevent shrinking

### Context content (Context)

- Simple text: `<Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>`
- Complex content: Extract to a separate `XContext` component
- Loading states: Use `CircularProgress size={20}` for async context content

## Examples

See:

- [TagRenderer.tsx](frontend/src/core/tag/TagRenderer.tsx) — minimal example
- [CodeRenderer.tsx](frontend/src/core/code/CodeRenderer.tsx) — with icon
- [ProjectRenderer.tsx](frontend/src/core/project/ProjectRenderer.tsx) — simple text
- [SpanAnnotationRenderer.tsx](frontend/src/core/span-annotation/SpanAnnotationRenderer.tsx) — uses `AnnotationSummaryRow`
