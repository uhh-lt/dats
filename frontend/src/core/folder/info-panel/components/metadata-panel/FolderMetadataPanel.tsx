import { TabContext, TabPanel } from "@mui/lab";
import { Box, CircularProgress, Stack, Tab, Tabs } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { FolderHooks } from "../../../../../api/FolderHooks.ts";
import { MetadataHooks } from "../../../../../api/MetadataHooks.ts";
import { DocType } from "../../../../../api/openapi/models/DocType.ts";
import { ProjectMetadataRead } from "../../../../../api/openapi/models/ProjectMetadataRead.ts";
import { SourceDocumentMetadataUpdate } from "../../../../../api/openapi/models/SourceDocumentMetadataUpdate.ts";
import { SearchActions } from "../../../../../features/search/DocumentSearch/searchSlice.ts";
import { useAppDispatch } from "../../../../../plugins/ReduxHooks.ts";
import { MetadataCreateButton } from "../../../../source-document/info-panel/components/metadata-panel/components/MetadataCreateButton.tsx";
import { FolderMetadataRow } from "./FolderMetadataRow.tsx";

interface FolderMetadataPanelProps {
  sdocFolderId: number;
  filterName: string;
}

export const FolderMetadataPanel = memo(({ sdocFolderId, filterName }: FolderMetadataPanelProps) => {
  const sdocIdsPerDoctype = FolderHooks.useGetSdocIdsPerDoctypeInSdocFolder(sdocFolderId);

  // tabs
  const [tab, setTab] = useState(DocType.TEXT);
  const handleTabChange = (_event: React.SyntheticEvent, newValue: DocType): void => {
    setTab(newValue);
  };

  return (
    <TabContext value={tab}>
      {sdocIdsPerDoctype.isLoading ? (
        <Box textAlign={"center"} pt={2}>
          <CircularProgress />
        </Box>
      ) : sdocIdsPerDoctype.isError ? (
        <span>{sdocIdsPerDoctype.error.message}</span>
      ) : sdocIdsPerDoctype.isSuccess ? (
        <>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
            <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
              {Object.values(DocType).map((docType) => (
                <Tab
                  key={docType}
                  label={`${docType} (${sdocIdsPerDoctype.data[docType]?.length || 0})`}
                  value={docType}
                />
              ))}
            </Tabs>
          </Box>
          <Box className="myFlexFillAllContainer">
            {Object.values(DocType).map((docType) => (
              <TabPanel key={docType} value={docType} sx={{ p: 0 }} className="h100">
                <FolderDoctypeMetadataPanel
                  doctype={docType}
                  sdocIds={sdocIdsPerDoctype.data[docType]}
                  filterName={filterName}
                />
              </TabPanel>
            ))}
          </Box>
        </>
      ) : null}
    </TabContext>
  );
});

interface FolderDoctypeMetadataPanelProps {
  filterName: string;
  doctype: DocType;
  sdocIds: number[];
}

function FolderDoctypeMetadataPanel({ filterName, doctype, sdocIds }: FolderDoctypeMetadataPanelProps) {
  const metadata = MetadataHooks.useGetSdocMetadataBulk(sdocIds);
  const dispatch = useAppDispatch();
  const handleAddMetadataFilter = useCallback(
    (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => {
      dispatch(SearchActions.onAddMetadataFilter({ metadata, projectMetadata, filterName }));
    },
    [dispatch, filterName],
  );

  return (
    <>
      <Box p={1}>
        <MetadataCreateButton docType={doctype} />
      </Box>
      <Stack direction="column" spacing={0}>
        {metadata.isLoading && (
          <Box textAlign={"center"} pt={2}>
            <CircularProgress />
          </Box>
        )}
        {metadata.isError && <span>An error occured!</span>}
        {metadata.isSuccess &&
          metadata
            .data!.sort((a, b) => a.project_metadata_id - b.project_metadata_id)
            .map((data) => (
              <FolderMetadataRow
                key={data.project_metadata_id}
                metadata={data}
                onAddFilterClick={handleAddMetadataFilter}
              />
            ))}
      </Stack>
    </>
  );
}
