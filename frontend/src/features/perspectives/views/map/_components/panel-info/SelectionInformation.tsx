import { getIconComponent, Icon } from "@components/icons";
import { TableInfoHooks } from "@core/filter";
import { LinkButton } from "@core/navigation";
import { SdocMetadataHooks, SdocMetadataRow } from "@core/sdoc-metadata";
import { SdocHooks, sdocQueries } from "@core/source-document";
import { TagMenuButton, tagQueries, TagRow } from "@core/tag";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { SourceDocumentMetadataUpdate } from "@models/SourceDocumentMetadataUpdate";
import { ArrowBackIosNew, ArrowForwardIos } from "@mui/icons-material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, Button, ButtonGroup, CircularProgress, Stack, Tooltip, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { PerspectivesHooks } from "../../../../api/perspectivesHooks";
import { perspectivesQueries } from "../../../../api/perspectivesQueries";
import { PerspectivesActions } from "../../../../store/perspectivesSlice";
import { PerspectivesMapRouteAPI } from "../../_hooks/perspectivesMapRouteAPI";

interface SelectionInformationProps {
  aspectId: number;
}

export function SelectionInformation({ aspectId }: SelectionInformationProps) {
  // global client state
  const selectedSdocIds = useAppSelector((state) => state.perspectives.selectedSdocIds);
  const selectedSdocIdsIndex = useAppSelector((state) => state.perspectives.selectedSdocIdsIndex);
  const colorScheme = useAppSelector((state) => state.perspectives.colorScheme);
  const projectId = useAppSelector((state) => state.project.projectId);

  // selection index management
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(PerspectivesActions.onSelectionIndexChange(0)); // Reset index when selection changes
  }, [dispatch, selectedSdocIds]);

  const handlePrevious = () => {
    if (selectedSdocIds.length === 0) return;
    const newIndex = selectedSdocIdsIndex === 0 ? selectedSdocIds.length - 1 : selectedSdocIdsIndex - 1;
    dispatch(PerspectivesActions.onSelectionIndexChange(newIndex));
  };

  const handleNext = () => {
    if (selectedSdocIds.length === 0) return;
    const newIndex = selectedSdocIdsIndex === selectedSdocIds.length - 1 ? 0 : selectedSdocIdsIndex + 1;
    dispatch(PerspectivesActions.onSelectionIndexChange(newIndex));
  };

  // global server state
  const metadata = SdocMetadataHooks.useGetSdocMetadata(selectedSdocIds[selectedSdocIdsIndex]);
  const documentTagIds = useQuery(tagQueries.idsBySdoc(selectedSdocIds[selectedSdocIdsIndex]));
  const docClusters = useQuery(perspectivesQueries.clustersBySdoc(aspectId, selectedSdocIds[selectedSdocIdsIndex]));
  const vis = PerspectivesHooks.useGetDocVisualization(aspectId);
  const sdoc = SdocHooks.useGetDocument(selectedSdocIds[selectedSdocIdsIndex]);

  // filtering
  const { projectId: routeProjectId } = PerspectivesMapRouteAPI.useParams();
  const columnInfoMap = TableInfoHooks.useColumnInfoMap(sdocQueries.tableInfo(routeProjectId));
  const handleAddMetadataFilter = (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => {
    // the column of a metadata filter is the project_metadata_id
    const filterOperator = columnInfoMap[projectMetadata.id.toString()]?.operator;
    if (!filterOperator) return;
    dispatch(
      PerspectivesActions.onAddMetadataFilter({
        metadata,
        projectMetadata,
        filterOperator,
        filterName: `aspect-${aspectId}`,
      }),
    );
  };

  // mutation
  const { mutate: updateMetadataMutation } = SdocMetadataHooks.useUpdateBulkSdocMetadata();
  const handleMetadataUpdate = useCallback(
    (metadataId: number) => (data: SourceDocumentMetadataUpdate) => {
      updateMetadataMutation({
        requestBody: [
          {
            sdoc_metadata_id: metadataId,
            str_value: data.str_value,
            int_value: data.int_value,
            date_value: data.date_value,
            boolean_value: data.boolean_value,
            list_value: data.list_value,
          },
        ],
      });
    },
    [updateMetadataMutation],
  );

  return (
    <Box>
      {selectedSdocIds.length > 0 ? (
        <Stack>
          <Box sx={{ display: "flex", alignItems: "center", p: 1 }}>
            <ButtonGroup size="small" variant="outlined" aria-label="Loading button group">
              <Button onClick={handlePrevious} disabled={selectedSdocIds.length <= 1} sx={{ minWidth: 0 }}>
                <ArrowBackIosNew fontSize="small" />
              </Button>
              <Button onClick={handleNext} disabled={selectedSdocIds.length <= 1} sx={{ minWidth: 0 }}>
                <ArrowForwardIos fontSize="small" />
              </Button>
            </ButtonGroup>
            <Typography sx={{ mx: 1 }}>
              Document #{selectedSdocIdsIndex + 1} of {selectedSdocIds.length}
            </Typography>
          </Box>
          <Stack direction="column" spacing={0}>
            <Stack p={1} sx={{ borderTop: 1, borderColor: "divider" }}>
              <Stack direction="row">
                <Tooltip title={"Filename/Title of this document"} placement="left">
                  <span style={{ flexGrow: 1, flexBasis: 1, justifyContent: "start" }}>
                    <Button color="inherit" startIcon={getIconComponent(Icon.TEXT_DOCUMENT)} disabled>
                      Name
                    </Button>
                  </span>
                </Tooltip>
                {projectId !== undefined && (
                  <LinkButton
                    to="/project/$projectId/annotation/$sdocId"
                    params={{ projectId, sdocId: selectedSdocIds[selectedSdocIdsIndex] }}
                    variant="text"
                    size="small"
                    startIcon={<OpenInNewIcon />}
                  >
                    Open Doc
                  </LinkButton>
                )}
              </Stack>

              <Stack direction="column" pl={0.5}>
                {sdoc.isLoading && (
                  <Box textAlign={"center"} pt={2}>
                    <CircularProgress />
                  </Box>
                )}
                {sdoc.isError && <span>{sdoc.error.message}</span>}
                {sdoc.isSuccess && <Typography>{sdoc.data.name}</Typography>}
              </Stack>
            </Stack>

            <Stack p={1} sx={{ borderTop: 1, borderColor: "divider" }}>
              <Stack direction="row">
                <Tooltip title={"Automatically detected cluster of this document"} placement="left">
                  <span style={{ flexGrow: 1, flexBasis: 1, justifyContent: "start" }}>
                    <Button color="inherit" startIcon={getIconComponent(Icon.CLUSTERS)} disabled>
                      Cluster
                    </Button>
                  </span>
                </Tooltip>
              </Stack>

              <Stack direction="column" pl={0.5}>
                {docClusters.isLoading && (
                  <Box textAlign={"center"} pt={2}>
                    <CircularProgress />
                  </Box>
                )}
                {docClusters.isError && <span>{docClusters.error.message}</span>}
                {docClusters.isSuccess &&
                  vis.data &&
                  docClusters.data.map((cluster) => {
                    const clusterIndex = vis.data.clusters.findIndex((t) => t.id === cluster.id);
                    return (
                      <Stack
                        spacing={1}
                        direction="row"
                        key={`sdoc-${selectedSdocIds[selectedSdocIdsIndex]}-cluster${cluster.id}`}
                        alignItems="center"
                      >
                        {getIconComponent(Icon.CLUSTER, {
                          style: {
                            color: colorScheme[clusterIndex % colorScheme.length],
                            fontSize: "10px",
                            width: "24px",
                          },
                        })}
                        <Typography>{cluster.is_outlier ? "Outlier Cluster / No Cluster" : cluster.name}</Typography>
                      </Stack>
                    );
                  })}
              </Stack>
            </Stack>

            <Stack p={1} sx={{ borderTop: 1, borderColor: "divider" }}>
              <Stack direction="row">
                <Tooltip title={"Tags applied to this document"} placement="left">
                  <span style={{ flexGrow: 1, flexBasis: 1, justifyContent: "start" }}>
                    <Button color="inherit" startIcon={getIconComponent(Icon.TAG)} disabled>
                      Tags
                    </Button>
                  </span>
                </Tooltip>
                <TagMenuButton
                  popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
                  type={"addBtn"}
                  selectedSdocIds={[selectedSdocIds[selectedSdocIdsIndex]]}
                />
              </Stack>
              <Stack direction="column" pl={0.5}>
                {documentTagIds.isLoading && (
                  <Box textAlign={"center"} pt={2}>
                    <CircularProgress />
                  </Box>
                )}
                {documentTagIds.isError && <span>{documentTagIds.error.message}</span>}
                {documentTagIds.isSuccess &&
                  documentTagIds.data.map((tagId) => (
                    <TagRow
                      key={`sdoc-${selectedSdocIds[selectedSdocIdsIndex]}-tag${tagId}`}
                      sdocId={selectedSdocIds[selectedSdocIdsIndex]}
                      tagId={tagId}
                    />
                  ))}
              </Stack>
            </Stack>

            {metadata.isLoading && (
              <Box textAlign={"center"} pt={2}>
                <CircularProgress />
              </Box>
            )}
            {metadata.isError && <span>{metadata.error.message}</span>}
            {metadata.isSuccess &&
              metadata.data
                .sort((a, b) => a.id - b.id)
                .map((data) => (
                  <SdocMetadataRow
                    key={data.id}
                    metadata={data}
                    onAddFilterClick={handleAddMetadataFilter}
                    onUpdateMetadata={handleMetadataUpdate(data.id)}
                  />
                ))}
          </Stack>
        </Stack>
      ) : (
        <Typography p={1}>Use the selection tools to select documents :)</Typography>
      )}
    </Box>
  );
}
