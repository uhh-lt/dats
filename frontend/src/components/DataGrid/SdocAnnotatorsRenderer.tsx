import { Stack } from "@mui/material";
import React from "react";
import SdocHooks from "../../api/SdocHooks.ts";
import { UserRead } from "../../api/openapi/models/UserRead.ts";
import UserRenderer from "./UserRenderer.tsx";

interface SdocAnnotatorsRendererProps {
  sdocId?: number;
  annotators?: number[] | UserRead[];
}

function SdocAnnotatorsRenderer({ sdocId, annotators, ...props }: SdocAnnotatorsRendererProps) {
  if (sdocId === undefined && annotators === undefined) {
    return <>Nothing to show :(</>;
  }

  if (annotators) {
    return <SdocAnnotatorsRendererWithData annotators={annotators} {...props} />;
  }

  if (sdocId) {
    return <SdocAnnotatorsRendererWithoutData sdocId={sdocId} {...props} />;
  }
  return null;
}

function SdocAnnotatorsRendererWithoutData({ sdocId, ...props }: { sdocId: number }) {
  const annotators = SdocHooks.useGetAllAnnotationDocuments(sdocId);

  if (annotators.isSuccess) {
    return <SdocAnnotatorsRendererWithData annotators={annotators.data.map((adoc) => adoc.user_id)} {...props} />;
  } else if (annotators.isError) {
    return <div>{annotators.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SdocAnnotatorsRendererWithData({ annotators }: { annotators: number[] | UserRead[] }) {
  return (
    <Stack direction="row" alignItems="center">
      {annotators.map((annotator, index) => (
        <React.Fragment key={typeof annotator === "number" ? annotator : annotator.id}>
          {index > 0 && <span style={{ whiteSpace: "pre" }}>, </span>}
          <UserRenderer user={annotator} />
        </React.Fragment>
      ))}
    </Stack>
  );
}

export default SdocAnnotatorsRenderer;
