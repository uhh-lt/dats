import { Stack } from "@mui/material";
import SdocHooks from "../../api/SdocHooks";
import { DocumentTagRead } from "../../api/openapi";
import TagRenderer from "./TagRenderer";

interface SharedProps {
  link?: boolean;
  renderFilename?: boolean;
  renderDoctypeIcon?: boolean;
}

interface SdocTagsRendererProps extends SharedProps {
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

function SdocTagsRendererWithoutData({ sdocId, ...props }: { sdocId: number } & SharedProps) {
  const tags = SdocHooks.useGetAllDocumentTags(sdocId);

  if (tags.isSuccess) {
    return <SdocTagsRendererWithData tags={tags.data.map((tag) => tag.id)} {...props} />;
  } else if (tags.isError) {
    return <div>{tags.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SdocTagsRendererWithData({ tags }: { tags: number[] | DocumentTagRead[] } & SharedProps) {
  return (
    <Stack direction="row" alignItems="center">
      {tags.map((tag) => (
        <TagRenderer key={typeof tag === "number" ? tag : tag.id} tag={tag} mr={0.5} />
      ))}
    </Stack>
  );
}

export default SdocTagsRenderer;