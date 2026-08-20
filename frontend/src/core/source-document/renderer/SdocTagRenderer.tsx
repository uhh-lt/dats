import { TagHooks } from "@api/hooks/TagHooks";
import { TagRenderer } from "@core/tag";
import { Stack } from "@mui/material";

interface SdocTagsRendererProps {
  sdocId?: number;
  tagIds?: number[];
}

export function SdocTagsRenderer({ sdocId, tagIds }: SdocTagsRendererProps) {
  if (sdocId === undefined && tagIds === undefined) {
    return <>Nothing to show :(</>;
  }

  if (tagIds) {
    return <SdocTagsRendererWithData tagIds={tagIds} />;
  }

  if (sdocId) {
    return <SdocTagsRendererWithoutData sdocId={sdocId} />;
  }
  return null;
}

function SdocTagsRendererWithoutData({ sdocId }: { sdocId: number }) {
  const tags = TagHooks.useGetAllTagIdsBySdocId(sdocId);

  if (tags.isSuccess) {
    return <SdocTagsRendererWithData tagIds={tags.data} />;
  } else if (tags.isError) {
    return <div>{tags.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SdocTagsRendererWithData({ tagIds }: { tagIds: number[] }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      {tagIds.map((tagId) => (
        <TagRenderer key={tagId} tag={tagId} />
      ))}
    </Stack>
  );
}
