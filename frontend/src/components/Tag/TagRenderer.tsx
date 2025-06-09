import { Stack, StackProps } from "@mui/material";
import TagHooks from "../../api/TagHooks.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";

interface TagRendererProps {
  tag: number | DocumentTagRead;
}

function TagRenderer({ tag, ...props }: TagRendererProps & Omit<StackProps, "direction" | "alignItems">) {
  if (typeof tag === "number") {
    return <TagRendererWithoutData tagId={tag} {...props} />;
  } else {
    return <TagRendererWithData tag={tag} {...props} />;
  }
}

function TagRendererWithoutData({ tagId, ...props }: { tagId: number } & Omit<StackProps, "direction" | "alignItems">) {
  const tag = TagHooks.useGetTag(tagId);

  if (tag.data) {
    return <TagRendererWithData tag={tag.data} {...props} />;
  } else if (tag.isError) {
    return <div>{tag.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function TagRendererWithData({
  tag,
  ...props
}: { tag: DocumentTagRead } & Omit<StackProps, "direction" | "alignItems">) {
  return (
    <Stack direction="row" alignItems="center" {...props}>
      {getIconComponent(Icon.TAG, { style: { color: tag.color } })}
      {tag.name}
    </Stack>
  );
}

export default TagRenderer;
