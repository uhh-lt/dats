import { Box, Stack } from "@mui/material";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import TagUnlinkButton from "../../Tag/TagExplorer/TagUnlinkButton.tsx";
import TagRenderer from "../../Tag/TagRenderer.tsx";

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
