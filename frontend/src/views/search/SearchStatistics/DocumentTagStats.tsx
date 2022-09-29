import { Button, ButtonProps, Stack } from "@mui/material";
import React from "react";
import TagHooks from "../../../api/TagHooks";
import { TagStat } from "../../../api/openapi";

interface DocumentTagStatsProps {
  data: TagStat[];
  handleClick: (tagId: number) => void;
}

function DocumentTagStats({ data, handleClick }: DocumentTagStatsProps) {
  // computed
  const maxValue = data.length > 0 ? data[0].count : 0;

  return (
    <Stack sx={{ whiteSpace: "nowrap" }} spacing={0.5}>
      {data.map((tagStat) => (
        <DocumentTagStatButtonContent
          key={tagStat.tag.id}
          sx={{ width: `${(tagStat.count / maxValue) * 100}%`, justifyContent: "left" }}
          variant="outlined"
          onClick={() => handleClick(tagStat.tag.id)}
          tagId={tagStat.tag.id}
          count={tagStat.count}
        />
      ))}
    </Stack>
  );
}

export default DocumentTagStats;

function DocumentTagStatButtonContent({ tagId, count, ...props }: { tagId: number; count: number } & ButtonProps) {
  const tag = TagHooks.useGetTag(tagId);

  return (
    <Button {...props} disabled={!tag.isSuccess}>
      {tag.isLoading && <>Loading...: {count}</>}
      {tag.isError && <>{tag.error.message} </>}
      {tag.isSuccess && (
        <>
          {tag.data.title}: {count}
        </>
      )}
    </Button>
  );
}
