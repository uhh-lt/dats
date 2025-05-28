import { ArrowBackIosNew, ArrowForwardIos } from "@mui/icons-material";
import { Box, Button, ButtonGroup, CircularProgress, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import MetadataHooks from "../../api/MetadataHooks.ts";
import SdocHooks from "../../api/SdocHooks.ts";
import TagHooks from "../../api/TagHooks.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import DocumentMetadataRow from "../../components/SourceDocument/DocumentInformation/Info/DocumentMetadataRow/DocumentMetadataRow.tsx";
import DocumentTagRow from "../../components/SourceDocument/DocumentInformation/Tags/DocumentTagRow.tsx";
import TagMenuButton from "../../components/Tag/TagMenu/TagMenuButton.tsx";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";

interface SelectionInformationProps {
  aspectId: number;
}

function SelectionInformation({ aspectId }: SelectionInformationProps) {
  // global client state
  const selectedSdocIds = useAppSelector((state) => state.atlas.selectedSdocIds);

  // selection index management
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    setCurrentIndex(0); // Reset index when selection changes
  }, [selectedSdocIds]);

  const handlePrevious = () => {
    if (selectedSdocIds.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? selectedSdocIds.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    if (selectedSdocIds.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex === selectedSdocIds.length - 1 ? 0 : prevIndex + 1));
  };

  // global server state
  const metadata = MetadataHooks.useGetSdocMetadata(selectedSdocIds[currentIndex]);
  const documentTagIds = TagHooks.useGetAllTagIdsBySdocId(selectedSdocIds[currentIndex]);
  const topics = TopicModellingHooks.useGetTopicsBySdocId(aspectId, selectedSdocIds[currentIndex]);
  const sdoc = SdocHooks.useGetDocument(selectedSdocIds[currentIndex]);

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
              Document #{currentIndex + 1} of {selectedSdocIds.length}
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
                {topics.isLoading && (
                  <Box textAlign={"center"} pt={2}>
                    <CircularProgress />
                  </Box>
                )}
                {topics.isError && <span>{topics.error.message}</span>}
                {topics.isSuccess &&
                  topics.data.map((topic) => (
                    <Stack
                      spacing={1}
                      direction="row"
                      key={`sdoc-${selectedSdocIds[currentIndex]}-topic${topic.id}`}
                      alignItems="center"
                    >
                      {getIconComponent(Icon.TOPIC, {
                        style: { color: topic.color, fontSize: "10px", width: "24px" },
                      })}
                      <Typography>{topic.name}</Typography>
                    </Stack>
                  ))}
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
                  selectedSdocIds={[selectedSdocIds[currentIndex]]}
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
                      key={`sdoc-${selectedSdocIds[currentIndex]}-tag${tagId}`}
                      sdocId={selectedSdocIds[currentIndex]}
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
                .map((data) => <DocumentMetadataRow key={data.id} metadata={data} filterName={"atlas"} />)}
          </Stack>
        </Stack>
      ) : (
        <Typography p={1}>Use the selection tools to select documents :)</Typography>
      )}
    </Box>
  );
}

export default SelectionInformation;
