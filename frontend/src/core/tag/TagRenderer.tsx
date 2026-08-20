import { TagHooks } from "@api/hooks/TagHooks";
import { ExpandableRenderer, ExpandableRendererProps } from "@components/ExpandableRenderer";
import { Icon, getIconComponent } from "@components/icons";
import { MemoIndicator } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { TagRead } from "@models/TagRead";
import { Stack, Typography } from "@mui/material";
import { memo } from "react";

export interface TagRendererSharedProps extends ExpandableRendererProps {
  renderMemoIndicator?: boolean;
}

interface TagRendererProps extends TagRendererSharedProps {
  tag: number | TagRead;
}

export const TagRenderer = memo(({ tag, ...props }: TagRendererProps) => {
  if (typeof tag === "number") {
    return <TagRendererWithoutData tagId={tag} {...props} />;
  } else {
    return <TagRendererWithData tag={tag} {...props} />;
  }
});

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

const TagRendererWithData = memo(
  ({ tag, renderMemoIndicator, ...expandProps }: { tag: TagRead } & TagRendererSharedProps) => {
    return (
      <ExpandableRenderer {...expandProps} expandedContent={<TagContext tag={tag} />}>
        <Stack direction="row" alignItems="center" minWidth={0} maxWidth="100%" overflow="hidden">
          {getIconComponent(Icon.TAG, { style: { color: tag.color, flexShrink: 0 } })}
          <Typography component="span" noWrap minWidth={0}>
            {tag.name}
          </Typography>
          {renderMemoIndicator && tag.memo_ids && tag.memo_ids.length > 0 && (
            <MemoIndicator
              memoIds={tag.memo_ids}
              attachedObjectType={AttachedObjectType.TAG}
              attachedObjectId={tag.id}
            />
          )}
        </Stack>
      </ExpandableRenderer>
    );
  },
);

function TagContext({ tag }: { tag: TagRead }) {
  return (
    <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {tag.description || "No description available."}
    </Typography>
  );
}
