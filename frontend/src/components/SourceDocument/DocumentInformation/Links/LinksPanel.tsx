import { TabPanel } from "@mui/lab";
import { Box, Button, CircularProgress, List, Stack } from "@mui/material";
import { memo } from "react";
import SdocHooks from "../../../../api/SdocHooks.ts";
import { Icon, getIconComponent } from "../../../../utils/icons/iconUtils.tsx";
import SdocListItem from "./SdocListItem.tsx";

interface LinksPanelProps {
  currentTab: string;
  sdocId: number;
}

function LinkPanel(props: LinksPanelProps) {
  if (props.currentTab === "links") {
    return <LinkPanelContent {...props} />;
  } else {
    return null;
  }
}

function LinkPanelContent({ sdocId }: LinksPanelProps) {
  const linkedSdocIds = SdocHooks.useGetLinkedSdocIds(sdocId);

  return (
    <TabPanel value="links" sx={{ p: 1 }} className="h100">
      <Button variant="text" size="small" startIcon={getIconComponent(Icon.ADD)}>
        Link documents
      </Button>
      <Stack direction="column" spacing={0.5}>
        {linkedSdocIds.isLoading && (
          <Box textAlign={"center"} pt={2}>
            <CircularProgress />
          </Box>
        )}
        {linkedSdocIds.isError && <span>{linkedSdocIds.error.message}</span>}
        {linkedSdocIds.isSuccess && (
          <List>
            {linkedSdocIds.data.map((sdocId) => (
              <SdocListItem key={sdocId} sdocId={sdocId} />
            ))}
          </List>
        )}
      </Stack>
    </TabPanel>
  );
}

export default memo(LinkPanel);
