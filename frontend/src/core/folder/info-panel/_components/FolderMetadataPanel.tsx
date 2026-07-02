import { FolderHooks } from "@api/hooks/FolderHooks";
import { MetadataHooks } from "@api/hooks/MetadataHooks";
import { ProjectMetadataCreateButton } from "@core/project-metadata";
import { SdocMetadataRow } from "@core/sdoc-metadata";
import { DocType } from "@models/DocType";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { SourceDocumentMetadataUpdate } from "@models/SourceDocumentMetadataUpdate";
import { TabContext, TabPanel } from "@mui/lab";
import { Box, CircularProgress, Stack, Tab, Tabs } from "@mui/material";
import { memo, useCallback, useState } from "react";

interface FolderMetadataPanelProps {
  sdocFolderId: number;
  onAddMetadataFilter?: (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => void;
}

export const FolderMetadataPanel = memo(({ sdocFolderId, onAddMetadataFilter }: FolderMetadataPanelProps) => {
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
                  onAddMetadataFilter={onAddMetadataFilter}
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
  doctype: DocType;
  sdocIds: number[];
  onAddMetadataFilter?: (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => void;
}

function FolderDoctypeMetadataPanel({ doctype, sdocIds, onAddMetadataFilter }: FolderDoctypeMetadataPanelProps) {
  const metadata = MetadataHooks.useGetSdocMetadataBulk(sdocIds);

  // mutation
  const { mutate: updateMetadataMutation } = MetadataHooks.useUpdateBulkSdocMetadata();
  const handleMetadataUpdate = useCallback(
    (metadataIds: number[]) => (data: SourceDocumentMetadataUpdate) => {
      updateMetadataMutation({
        requestBody: metadataIds.map((sdocMetadataId) => ({
          id: sdocMetadataId,
          str_value: data.str_value,
          int_value: data.int_value,
          date_value: data.date_value ? new Date(data.date_value).toISOString() : data.date_value,
          boolean_value: data.boolean_value,
          list_value: data.list_value,
        })),
      });
    },
    [updateMetadataMutation],
  );

  return (
    <>
      <Box p={1}>
        <ProjectMetadataCreateButton docType={doctype} />
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
              <SdocMetadataRow
                key={data.project_metadata_id}
                metadata={data}
                onAddFilterClick={onAddMetadataFilter}
                onUpdateMetadata={handleMetadataUpdate(data.ids)}
              />
            ))}
      </Stack>
    </>
  );
}
