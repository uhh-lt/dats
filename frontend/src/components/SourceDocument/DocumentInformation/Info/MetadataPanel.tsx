import { TabPanel } from "@mui/lab";
import { Box, CircularProgress, Stack } from "@mui/material";
import { memo, useCallback } from "react";
import MetadataHooks from "../../../../api/MetadataHooks.ts";
import { ProjectMetadataRead } from "../../../../api/openapi/models/ProjectMetadataRead.ts";
import { SourceDocumentMetadataUpdate } from "../../../../api/openapi/models/SourceDocumentMetadataUpdate.ts";
import { useAppDispatch } from "../../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../../../views/search/DocumentSearch/searchSlice.ts";
import DocumentMetadataRow from "./DocumentMetadataRow/DocumentMetadataRow.tsx";
import MetadataCreateButton from "./MetadataCreateButton.tsx";

interface MetadataPanelProps {
  currentTab: string;
  sdocId: number;
  filterName: string;
}

function MetadataPanel(props: MetadataPanelProps) {
  if (props.currentTab === "info") {
    return <MetadataPanelContent {...props} />;
  } else {
    return null;
  }
}

function MetadataPanelContent({ sdocId, filterName }: MetadataPanelProps) {
  const metadata = MetadataHooks.useGetSdocMetadata(sdocId);
  const dispatch = useAppDispatch();
  const handleAddMetadataFilter = useCallback(
    (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => {
      dispatch(SearchActions.onAddMetadataFilter({ metadata, projectMetadata, filterName }));
    },
    [dispatch, filterName],
  );

  return (
    <TabPanel value="info" sx={{ p: 0 }} className="h100">
      <Box p={1}>
        <MetadataCreateButton sdocId={sdocId} />
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
              <DocumentMetadataRow key={data.id} metadata={data} onAddFilterClick={handleAddMetadataFilter} />
            ))}
      </Stack>
    </TabPanel>
  );
}

export default memo(MetadataPanel);
