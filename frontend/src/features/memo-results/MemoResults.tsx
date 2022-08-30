import { Stack } from "@mui/material";
import React from "react";
import MemoCard from "./MemoCard";

interface MemoResultsProps {
  memoIds: number[];
  filter: string | undefined;
}

// todo: the filtering should happen in the backend?
function MemoResults({ memoIds, filter }: MemoResultsProps) {
  return (
    <Stack spacing={2}>
      {memoIds.map((memoId) => (
        <MemoCard key={memoId} memoId={memoId} filter={filter} />
      ))}
    </Stack>
  );
}

export default MemoResults;
