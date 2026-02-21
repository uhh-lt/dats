import { TabPanel } from "@mui/lab";
import { Box, CircularProgress, Stack } from "@mui/material";
import { memo } from "react";
import { TagHooks } from "../../../../../api/TagHooks.ts";
import { TagMenuButton } from "../../../../tag/menu/TagMenuButton.tsx";
import { DocumentTagRow } from "./DocumentTagRow.tsx";

interface TagPanelProps {
  currentTab: string;
  sdocId: number;
}

export const TagPanel = memo((props: TagPanelProps) => {
  if (props.currentTab === "tags") {
    return <TagPanelContent {...props} />;
  } else {
    return null;
  }
});

function TagPanelContent({ sdocId }: TagPanelProps) {
  const documentTagIds = TagHooks.useGetAllTagIdsBySdocId(sdocId);

  return (
    <TabPanel value="tags" sx={{ p: 1 }} className="h100">
      <TagMenuButton
        popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
        type={"addBtn"}
        selectedSdocIds={[sdocId]}
      />
      <Stack direction="column" spacing={0.5}>
        {documentTagIds.isLoading && (
          <Box textAlign={"center"} pt={2}>
            <CircularProgress />
          </Box>
        )}
        {documentTagIds.isError && <span>{documentTagIds.error.message}</span>}
        {documentTagIds.isSuccess &&
          documentTagIds.data.map((tagId) => (
            <DocumentTagRow key={`sdoc-${sdocId}-tag${tagId}`} sdocId={sdocId} tagId={tagId} />
          ))}
      </Stack>
    </TabPanel>
  );
}
