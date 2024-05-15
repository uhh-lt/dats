import LabelIcon from "@mui/icons-material/Label";
import { Stack, StackProps } from "@mui/material";
import TagHooks from "../../api/TagHooks.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";

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

  if (tag.isSuccess) {
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
      <LabelIcon style={{ color: tag.color }} />
      {tag.name}
    </Stack>
  );
}

export default TagRenderer;
