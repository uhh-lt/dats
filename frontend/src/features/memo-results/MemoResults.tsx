import { Stack } from "@mui/material";
import React from "react";
import MemoCard from "./MemoCard";
import { MemoRead } from "../../api/openapi";

interface MemoResultsProps {
  memos: MemoRead[];
}

function MemoResults({ memos }: MemoResultsProps) {
  return (
    <Stack spacing={2}>
      {memos.map((memo) => (
        <MemoCard key={memo.id} memoId={memo.id} />
      ))}
    </Stack>
  );
}

export default MemoResults;
