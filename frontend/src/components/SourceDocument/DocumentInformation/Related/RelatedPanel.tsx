import { TabPanel } from "@mui/lab";
import { Box, CircularProgress, List } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useRef } from "react";
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

  const items = virtualizer.getVirtualItems();
  return (
    <TabPanel value="related" sx={{ p: 0 }} className="h100">
      <Box ref={parentRef} sx={{ p: 1, overflowY: "auto" }} className="h100">
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
