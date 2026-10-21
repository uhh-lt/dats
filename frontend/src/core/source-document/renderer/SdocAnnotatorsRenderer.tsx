import { UserRenderer } from "@core/user";
import { UserRead } from "@models/UserRead";
import { Stack } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Fragment, memo } from "react";
import { sdocQueries } from "../api/sdocQueries";

interface SdocAnnotatorsRendererProps {
  sdocId?: number;
  annotators?: number[] | UserRead[];
}

export const SdocAnnotatorsRenderer = memo(({ sdocId, annotators }: SdocAnnotatorsRendererProps) => {
  if (annotators) {
    return <SdocAnnotatorsRendererWithData annotators={annotators} />;
  } else if (sdocId !== undefined) {
    return <SdocAnnotatorsRendererWithoutData sdocId={sdocId} />;
  } else {
    return <>Nothing to show :(</>;
  }
});

const SdocAnnotatorsRendererWithoutData = memo(({ sdocId }: { sdocId: number }) => {
  const annotators = useQuery(sdocQueries.annotators(sdocId));

  if (annotators.isSuccess) {
    return <SdocAnnotatorsRendererWithData annotators={annotators.data} />;
  } else if (annotators.isError) {
    return <div>{annotators.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
});

const SdocAnnotatorsRendererWithData = memo(({ annotators }: { annotators: number[] | UserRead[] }) => {
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
});
