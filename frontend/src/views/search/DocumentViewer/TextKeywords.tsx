import SdocHooks from "../../../api/SdocHooks";
import React from "react";
import { Stack } from "@mui/material";

interface DocumentKeywordsProps {
  sdocId: number | undefined;
}

function TextKeywords({ sdocId }: DocumentKeywordsProps) {
  const keywords = SdocHooks.useGetDocumentKeywords(sdocId);

  return (
    <>
      {keywords.isLoading && <div>Loading...</div>}
      {keywords.isError && <div>{keywords.error.message}</div>}
      {keywords.isSuccess && (
        <Stack direction={"row"}>
          <b>Keywords: </b>
          {keywords.data.keywords.map((keyword) => (
            <span style={{ marginLeft: "2px" }} key={keyword}>
              {keyword}
            </span>
          ))}
        </Stack>
      )}
    </>
  );
}

export default TextKeywords;
