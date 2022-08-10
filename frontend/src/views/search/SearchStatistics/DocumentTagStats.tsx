import { Button, ButtonProps, Stack } from "@mui/material";
import React from "react";
import useComputeDocumentTagStats from "./useComputeDocumentTagStats";
import TagHooks from "../../../api/TagHooks";

interface DocumentTagStatsProps {
  documentIds: number[] | undefined;
  handleClick: (tagId: number) => void;
}

function DocumentTagStats({ documentIds, handleClick }: DocumentTagStatsProps) {
  const tagStats = useComputeDocumentTagStats(documentIds);
  const maxValue = tagStats.data.length > 0 ? tagStats.data[0].count : 0;

  return (
    <>
      {tagStats.isLoading && <div>Loading!</div>}
      {tagStats.isError && <div>Error: {tagStats.error!.message}</div>}
      {tagStats.isSuccess && (
        <Stack sx={{ whiteSpace: "nowrap" }} spacing={0.5}>
          {tagStats.data.map((tagStat) => (
            <DocumentTagStatButtonContent
              key={tagStat.tagId}
              sx={{ width: `${(tagStat.count / maxValue) * 100}%`, justifyContent: "left" }}
              variant="outlined"
              onClick={() => handleClick(tagStat.tagId)}
              tagId={tagStat.tagId}
              count={tagStat.count}
            />
          ))}
        </Stack>
      )}
    </>
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
