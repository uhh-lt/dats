import { TagHooks } from "@api/hooks/TagHooks";
import { Box, Stack } from "@mui/material";
import { memo } from "react";
import { TagRenderer } from "./TagRenderer";
import { TagUnlinkButton } from "./TagUnlinkButton";

interface TagRow {
  sdocId: number;
  tagId: number;
}

export const TagRow = memo(({ tagId, sdocId }: TagRow) => {
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
