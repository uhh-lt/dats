import { Box, Stack } from "@mui/material";
import { DocumentTagRead } from "../../../../api/openapi/models/DocumentTagRead.ts";
import TagRenderer from "../../../../components/DataGrid/TagRenderer.tsx";
import TagUnlinkButton from "../../../../features/TagExplorer/TagUnlinkButton.tsx";

interface DocumentTagRow {
  sdocId: number;
  tag: DocumentTagRead;
}

function DocumentTagRow({ tag, sdocId }: DocumentTagRow) {
  return (
    <Stack direction={"row"}>
      <TagRenderer tag={tag} />
      <Box sx={{ flexGrow: 1 }} />
      <TagUnlinkButton sdocId={sdocId} tag={tag} />
    </Stack>
  );
}

export default DocumentTagRow;
