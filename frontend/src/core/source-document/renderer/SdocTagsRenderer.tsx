import { tagQueries, TagRenderer } from "@core/tag";
import { Stack } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { memo } from "react";

interface SdocTagsRendererProps {
  sdocId?: number;
  tagIds?: number[];
}

export const SdocTagsRenderer = memo(({ sdocId, tagIds }: SdocTagsRendererProps) => {
  if (tagIds) {
    return <SdocTagsRendererWithData tagIds={tagIds} />;
  } else if (sdocId !== undefined) {
    return <SdocTagsRendererWithoutData sdocId={sdocId} />;
  } else {
    return <>Nothing to show :(</>;
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
