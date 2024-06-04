import { Stack, StackProps } from "@mui/material";
import SdocHooks from "../../api/SdocHooks.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import TagRenderer from "../Tag/TagRenderer.tsx";

interface SharedProps {
  stackProps?: Omit<StackProps, "direction" | "alignItems">;
}
interface SdocTagsRendererProps {
  sdocId?: number;
  tags?: number[] | DocumentTagRead[];
}

function SdocTagsRenderer({ sdocId, tags, ...props }: SdocTagsRendererProps & SharedProps) {
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

function SdocTagsRendererWithData({ tags, stackProps }: { tags: number[] | DocumentTagRead[] } & SharedProps) {
  return (
    <Stack direction="row" alignItems="center" {...stackProps}>
      {tags.map((tag) => (
        <TagRenderer key={typeof tag === "number" ? tag : tag.id} tag={tag} mr={0.5} sx={{ textWrap: "nowrap" }} />
      ))}
    </Stack>
  );
}

export default SdocTagsRenderer;
