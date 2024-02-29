import { Stack } from "@mui/material";
import SdocHooks from "../../api/SdocHooks.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import TagRenderer from "./TagRenderer.tsx";

interface SdocTagsRendererProps {
  sdocId?: number;
  tags?: number[] | DocumentTagRead[];
}

function SdocTagsRenderer({ sdocId, tags, ...props }: SdocTagsRendererProps) {
  if (sdocId === undefined && tags === undefined) {
    return <>Nothing to show :(</>;
  }

  if (tags) {
    return <SdocTagsRendererWithData tags={tags} {...props} />;
  }

  if (sdocId) {
    return <SdocTagsRendererWithoutData sdocId={sdocId} {...props} />;
  }
  return null;
}

function SdocTagsRendererWithoutData({ sdocId, ...props }: { sdocId: number }) {
  const tags = SdocHooks.useGetAllDocumentTags(sdocId);

  if (tags.isSuccess) {
    return <SdocTagsRendererWithData tags={tags.data.map((tag) => tag.id)} {...props} />;
  } else if (tags.isError) {
    return <div>{tags.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SdocTagsRendererWithData({ tags }: { tags: number[] | DocumentTagRead[] }) {
  return (
    <Stack direction="row" alignItems="center">
      {tags.map((tag) => (
        <TagRenderer key={typeof tag === "number" ? tag : tag.id} tag={tag} mr={0.5} />
      ))}
    </Stack>
  );
}

export default SdocTagsRenderer;
