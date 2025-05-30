import { ArrowBackIosNew, ArrowForwardIos } from "@mui/icons-material";
import { Box, Button, ButtonGroup, CircularProgress, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect } from "react";
import MetadataHooks from "../../api/MetadataHooks.ts";
import SdocHooks from "../../api/SdocHooks.ts";
import TagHooks from "../../api/TagHooks.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import DocumentMetadataRow from "../../components/SourceDocument/DocumentInformation/Info/DocumentMetadataRow/DocumentMetadataRow.tsx";
import DocumentTagRow from "../../components/SourceDocument/DocumentInformation/Tags/DocumentTagRow.tsx";
import TagMenuButton from "../../components/Tag/TagMenu/TagMenuButton.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { AtlasActions } from "./atlasSlice.ts";

interface SelectionInformationProps {
  aspectId: number;
}

function SelectionInformation({ aspectId }: SelectionInformationProps) {
  // global client state
  const selectedSdocIds = useAppSelector((state) => state.atlas.selectedSdocIds);
  const selectedSdocIdsIndex = useAppSelector((state) => state.atlas.selectedSdocIdsIndex);
  const colorScheme = useAppSelector((state) => state.atlas.colorScheme);

  // selection index management
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(AtlasActions.onSelectionIndexChange(0)); // Reset index when selection changes
  }, [dispatch, selectedSdocIds]);

  const handlePrevious = () => {
    if (selectedSdocIds.length === 0) return;
    const newIndex = selectedSdocIdsIndex === 0 ? selectedSdocIds.length - 1 : selectedSdocIdsIndex - 1;
    dispatch(AtlasActions.onSelectionIndexChange(newIndex));
  };

  const handleNext = () => {
    if (selectedSdocIds.length === 0) return;
    const newIndex = selectedSdocIdsIndex === selectedSdocIds.length - 1 ? 0 : selectedSdocIdsIndex + 1;
    dispatch(AtlasActions.onSelectionIndexChange(newIndex));
  };

  // global server state
  const metadata = MetadataHooks.useGetSdocMetadata(selectedSdocIds[selectedSdocIdsIndex]);
  const documentTagIds = TagHooks.useGetAllTagIdsBySdocId(selectedSdocIds[selectedSdocIdsIndex]);
  const docTopics = TopicModellingHooks.useGetTopicsBySdocId(aspectId, selectedSdocIds[selectedSdocIdsIndex]);
  const vis = TopicModellingHooks.useGetDocVisualization(aspectId);
  const sdoc = SdocHooks.useGetDocument(selectedSdocIds[selectedSdocIdsIndex]);

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
                      Title
                    </Button>
                  </span>
                </Tooltip>
              </Stack>

              <Stack direction="column" pl={0.5}>
                {sdoc.isLoading && (
                  <Box textAlign={"center"} pt={2}>
                    <CircularProgress />
                  </Box>
                )}
                {sdoc.isError && <span>{sdoc.error.message}</span>}
                {sdoc.isSuccess && <Typography>{sdoc.data.name || sdoc.data.filename}</Typography>}
              </Stack>
            </Stack>

            <Stack p={1} sx={{ borderTop: 1, borderColor: "divider" }}>
              <Stack direction="row">
                <Tooltip title={"Automatically detected topics of this document"} placement="left">
                  <span style={{ flexGrow: 1, flexBasis: 1, justifyContent: "start" }}>
                    <Button color="inherit" startIcon={getIconComponent(Icon.TOPICS)} disabled>
                      Topics
                    </Button>
                  </span>
                </Tooltip>
              </Stack>

              <Stack direction="column" pl={0.5}>
                {docTopics.isLoading && (
                  <Box textAlign={"center"} pt={2}>
                    <CircularProgress />
                  </Box>
                )}
                {docTopics.isError && <span>{docTopics.error.message}</span>}
                {docTopics.isSuccess &&
                  vis.data &&
                  docTopics.data.map((topic) => {
                    const topicIndex = vis.data.topics.findIndex((t) => t.id === topic.id);
                    return (
                      <Stack
                        spacing={1}
                        direction="row"
                        key={`sdoc-${selectedSdocIds[selectedSdocIdsIndex]}-topic${topic.id}`}
                        alignItems="center"
                      >
                        {getIconComponent(Icon.TOPIC, {
                          style: {
                            color: colorScheme[topicIndex % colorScheme.length],
                            fontSize: "10px",
                            width: "24px",
                          },
                        })}
                        <Typography>{topic.name}</Typography>
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
                    <DocumentTagRow
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
                .map((data) => <DocumentMetadataRow key={data.id} metadata={data} filterName={`aspect-${aspectId}`} />)}
          </Stack>
        </Stack>
      ) : (
        <Typography p={1}>Use the selection tools to select documents :)</Typography>
      )}
    </Box>
  );
}

export default SelectionInformation;
