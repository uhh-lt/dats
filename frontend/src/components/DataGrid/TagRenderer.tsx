import LabelIcon from "@mui/icons-material/Label";
import TagHooks from "../../api/TagHooks";
import { DocumentTagRead } from "../../api/openapi";
import { Stack } from "@mui/material";

interface TagRendererProps {
  tag: number | DocumentTagRead;
}

function TagRenderer({ tag }: TagRendererProps) {
  if (typeof tag === "number") {
    return <TagRendererWithoutData tagId={tag} />;
  } else {
    return <TagRendererWithData tag={tag} />;
  }
}

function TagRendererWithoutData({ tagId }: { tagId: number }) {
  const tag = TagHooks.useGetTag(tagId);

  if (tag.isSuccess) {
    return <TagRendererWithData tag={tag.data} />;
  } else if (tag.isError) {
    return <div>{tag.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function TagRendererWithData({ tag }: { tag: DocumentTagRead }) {
  return (
    <Stack direction="row" alignItems="center">
      <LabelIcon style={{ color: tag.color }} />
      {tag.title}
    </Stack>
  );
}

export default TagRenderer;
