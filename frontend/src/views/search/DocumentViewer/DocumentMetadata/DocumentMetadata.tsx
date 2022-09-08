import React, { useMemo } from "react";
import { SourceDocumentMetadataRead } from "../../../../api/openapi";
import { Box, Grid } from "@mui/material";
import { UseQueryResult } from "@tanstack/react-query";
import DocumentKeywordsRow from "./DocumentKeywordsRow";
import DocumentMetadataRow from "./DocumentMetadataRow";
import DocumentMetadataAddButton from "./DocumentMetadataAddButton";

interface DocumentMetadataProps {
  sdocId: number | undefined;
  metadata: UseQueryResult<Map<string, SourceDocumentMetadataRead>, Error>;
}

function DocumentMetadata({ sdocId, metadata }: DocumentMetadataProps) {
  // computed
  const filteredMetadata = useMemo(() => {
    if (metadata.data) {
      const metadatas = Array.from(metadata.data.values());
      return metadatas.filter((x) => x.key !== "word_frequencies");
    }
    return [];
  }, [metadata.data]);

  return (
    <Box>
      {metadata.isLoading && <h1>Loading...</h1>}
      {metadata.isError && <h1>{metadata.error.message}</h1>}
      {metadata.isSuccess && (
        <Grid container rowSpacing={2} columnSpacing={1}>
          <DocumentKeywordsRow sdocId={sdocId} />
          {filteredMetadata.map((data) => (
            <DocumentMetadataRow key={data.id} metadata={data} />
          ))}
          <DocumentMetadataAddButton sdocId={sdocId!} />
        </Grid>
      )}
    </Box>
  );
}

export default DocumentMetadata;
