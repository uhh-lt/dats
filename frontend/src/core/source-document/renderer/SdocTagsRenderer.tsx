import { tagQueries, TagRenderer } from "@core/tag";
import { Stack } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { memo } from "react";

// the tags of a document: loaded by the document's id, or given as tag ids
type SdocTagsRendererProps = { sdocId: number } | { tagIds: number[] };

export const SdocTagsRenderer = memo((props: SdocTagsRendererProps) => {
  if ("sdocId" in props) {
    return <SdocTagsRendererWithoutData sdocId={props.sdocId} />;
  } else {
    return <SdocTagsRendererWithData tagIds={props.tagIds} />;
  }
});

const SdocTagsRendererWithoutData = memo(({ sdocId }: { sdocId: number }) => {
  const tags = useQuery(tagQueries.idsBySdoc(sdocId));

  if (tags.isSuccess) {
    return <SdocTagsRendererWithData tagIds={tags.data} />;
  } else if (tags.isError) {
    return <div>{tags.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
});

const SdocTagsRendererWithData = memo(({ tagIds }: { tagIds: number[] }) => {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      {tagIds.map((tagId) => (
        <TagRenderer key={tagId} tag={tagId} />
      ))}
    </Stack>
  );
});
