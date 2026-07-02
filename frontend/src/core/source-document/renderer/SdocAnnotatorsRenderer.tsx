import { SdocHooks } from "@api/hooks/SdocHooks";
import { UserRenderer } from "@core/user";
import { UserRead } from "@models/UserRead";
import { Stack } from "@mui/material";
import { Fragment } from "react";

interface SdocAnnotatorsRendererProps {
  sdocId?: number;
  annotators?: number[] | UserRead[];
}

export function SdocAnnotatorsRenderer({ sdocId, annotators, ...props }: SdocAnnotatorsRendererProps) {
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
  const annotators = SdocHooks.useGetAnnotators(sdocId);

  if (annotators.isSuccess) {
    return <SdocAnnotatorsRendererWithData annotators={annotators.data} {...props} />;
  } else if (annotators.isError) {
    return <div>{annotators.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SdocAnnotatorsRendererWithData({ annotators }: { annotators: number[] | UserRead[] }) {
  return (
    <Stack direction="row" alignItems="center" flexWrap="wrap">
      {annotators.map((annotator, index) => (
        <Fragment key={typeof annotator === "number" ? annotator : annotator.id}>
          <UserRenderer user={annotator} />
          {index < annotators.length - 1 && <span style={{ whiteSpace: "pre" }}>, </span>}
        </Fragment>
      ))}
    </Stack>
  );
}
