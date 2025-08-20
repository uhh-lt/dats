import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { TabPanel } from "@mui/lab";
import { Box, Button, CircularProgress, List, Stack } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SdocHooks from "../../../../api/SdocHooks.ts";
import SdocListItem from "./SdocListItem.tsx";

interface RelatedPanelProps {
  currentTab: string;
  sdocId: number;
}

function RelatedPanel(props: RelatedPanelProps) {
  if (props.currentTab === "related") {
    return <RelatedPanelContent {...props} />;
  } else {
    return null;
  }
}

function RelatedPanelContent({ sdocId }: RelatedPanelProps) {
  const relatedSdocIds = SdocHooks.useGetSameFolderSdocIds(sdocId);

  // virtualization
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: relatedSdocIds.data?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
  });

  // check if we are in annotation view
  const params = useParams() as { projectId: string; sdocId: string | undefined };
  const openedSdocId = params.sdocId ? parseInt(params.sdocId) : undefined;
  const navigate = useNavigate();

  // Navigation handler for prev, next, and open
  const handleNavigate = (direction: "prev" | "next" | "open") => {
    if (!relatedSdocIds.data || !params.projectId) return;
    const relatedIds = relatedSdocIds.data;
    const currentIndex = relatedIds.findIndex((id) => id === sdocId);
    let targetId: number | undefined;
    if (direction === "prev") {
      targetId = currentIndex > 0 ? relatedIds[currentIndex - 1] : relatedIds[relatedIds.length - 1];
    } else if (direction === "next") {
      targetId = currentIndex < relatedIds.length - 1 ? relatedIds[currentIndex + 1] : relatedIds[0];
    } else if (direction === "open") {
      targetId = sdocId;
    }
    if (targetId !== undefined) {
      navigate(`/project/${params.projectId}/annotation/${targetId}`);
    }
  };

  const items = virtualizer.getVirtualItems();
  return (
    <TabPanel value="related" sx={{ p: 1 }} className="h100 myFlexContainer">
      <Stack
        direction="row"
        alignItems="center"
        width="100%"
        justifyContent="space-between"
        className="myFlexFitContentContainer"
        pb={1}
      >
        <Button startIcon={<ArrowBackIcon />} disabled={!openedSdocId} onClick={() => handleNavigate("prev")}>
          Prev
        </Button>
        <Button disabled={!!openedSdocId} onClick={() => handleNavigate("open")}>
          Open this document
        </Button>
        <Button endIcon={<ArrowForwardIcon />} disabled={!openedSdocId} onClick={() => handleNavigate("next")}>
          Next
        </Button>
      </Stack>
      <Box ref={parentRef} sx={{ p: 0, overflowY: "auto" }} className="myFlexFillAllContainer">
        {relatedSdocIds.isLoading && (
          <Box textAlign={"center"} pt={2}>
            <CircularProgress />
          </Box>
        )}
        {relatedSdocIds.isError && <span>{relatedSdocIds.error.message}</span>}
        {relatedSdocIds.isSuccess && (
          <Box height={virtualizer.getTotalSize()} width="100%" position="relative">
            <List
              disablePadding
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${items[0]?.start ?? 0}px)`,
              }}
            >
              {items.map((virtualItem) => (
                <SdocListItem
                  sdocId={relatedSdocIds.data[virtualItem.index]}
                  key={virtualItem.key}
                  ref={virtualizer.measureElement}
                  selected={relatedSdocIds.data[virtualItem.index] === sdocId}
                />
              ))}
            </List>
          </Box>
        )}
      </Box>
    </TabPanel>
  );
}

export default memo(RelatedPanel);
