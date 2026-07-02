import { MetadataHooks } from "@api/hooks/MetadataHooks";
import { ProjectMetadataCreateButton } from "@core/project-metadata";
import { SdocMetadataRow } from "@core/sdoc-metadata";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { SourceDocumentMetadataUpdate } from "@models/SourceDocumentMetadataUpdate";
import { TabPanel } from "@mui/lab";
import { Box, CircularProgress, Stack } from "@mui/material";
import { memo, useCallback } from "react";

interface MetadataPanelProps {
  currentTab: string;
  sdocId: number;
  onAddFilterClick?: (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => void;
}

export const MetadataPanel = memo((props: MetadataPanelProps) => {
  if (props.currentTab === "info") {
    return <MetadataPanelContent {...props} />;
  } else {
    return null;
  }
});

function MetadataPanelContent({ sdocId, onAddFilterClick }: MetadataPanelProps) {
  const metadata = MetadataHooks.useGetSdocMetadata(sdocId);

  // mutation
  const { mutate: updateMetadataMutation } = MetadataHooks.useUpdateBulkSdocMetadata();
  const handleMetadataUpdate = useCallback(
    (metadataId: number) => (data: SourceDocumentMetadataUpdate) => {
      updateMetadataMutation({
        requestBody: [
          {
            id: metadataId,
            str_value: data.str_value,
            int_value: data.int_value,
            date_value: data.date_value ? new Date(data.date_value).toISOString() : data.date_value,
            boolean_value: data.boolean_value,
            list_value: data.list_value,
          },
        ],
      });
    },
    [updateMetadataMutation],
  );

  return (
    <TabPanel value="info" sx={{ p: 0 }} className="h100">
      <Box p={1}>
        <ProjectMetadataCreateButton sdocId={sdocId} />
      </Box>
      <Stack direction="column" spacing={0}>
        {metadata.isLoading && (
          <Box textAlign={"center"} pt={2}>
            <CircularProgress />
          </Box>
        )}
        {metadata.isError && <span>{metadata.error.message}</span>}
        {metadata.isSuccess &&
          metadata.data
            .sort((a, b) => a.project_metadata_id - b.project_metadata_id)
            .map((data) => (
              <SdocMetadataRow
                key={data.id}
                metadata={data}
                onAddFilterClick={onAddFilterClick}
                onUpdateMetadata={handleMetadataUpdate(data.id)}
              />
            ))}
      </Stack>
    </TabPanel>
  );
}
