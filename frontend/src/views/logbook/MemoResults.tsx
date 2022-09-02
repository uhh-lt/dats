import { Stack } from "@mui/material";
import React from "react";
import MemoCard from "./MemoCard";

interface MemoResultsProps {
  memoIds: number[];
  filter: string | undefined;
  noResultsText: string;
}

// todo: the filtering should happen in the backend?
function MemoResults({ noResultsText, memoIds, filter }: MemoResultsProps) {
  return (
    <Stack spacing={2}>
      {memoIds.map((memoId) => (
        <MemoCard key={memoId} memoId={memoId} filter={filter} />
      ))}
      {memoIds.length === 0 && <div>{noResultsText}</div>}
    </Stack>
  );
}

export default MemoResults;
