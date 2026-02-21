import { Box, Stack } from "@mui/material";
import { memo } from "react";
import { TagHooks } from "../../../../../api/TagHooks.ts";
import { TagUnlinkButton } from "../../../../tag/TagUnlinkButton.tsx";
import { TagRenderer } from "../../../../tag/renderer/TagRenderer.tsx";

interface DocumentTagRow {
  sdocId: number;
  tagId: number;
}

export const DocumentTagRow = memo(({ tagId, sdocId }: DocumentTagRow) => {
  const tag = TagHooks.useGetTag(tagId);

  return (
    <Stack direction={"row"}>
      {tag.isSuccess ? (
        <>
          <TagRenderer tag={tag.data} />
          <Box sx={{ flexGrow: 1 }} />
          <TagUnlinkButton sdocId={sdocId} tag={tag.data} size="small" />
        </>
      ) : tag.isLoading ? (
        <span>Loading...</span>
      ) : tag.isError ? (
        <span>{tag.error.message}</span>
      ) : (
        <span>Nothing to show :(</span>
      )}
    </Stack>
  );
});
