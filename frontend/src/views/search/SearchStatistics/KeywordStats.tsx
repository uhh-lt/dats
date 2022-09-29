import { Button, Stack } from "@mui/material";
import React, { useMemo } from "react";
import { KeywordStat } from "../../../api/openapi";

interface KeywordStatsProps {
  data: KeywordStat[];
  handleClick: (keyword: string) => void;
}

function KeywordStats({ data, handleClick }: KeywordStatsProps) {
  // computed
  const maxValue = useMemo(() => Math.max(...data.map((x) => x.count)), [data]);

  // render
  return (
    <Stack sx={{ whiteSpace: "nowrap" }} spacing={0.5}>
      {data
        .filter((keyword) => keyword.count >= 1)
        .sort((a: KeywordStat, b: KeywordStat) => b.count - a.count)
        .map((keyword: KeywordStat) => (
          <Button
            key={keyword.keyword}
            sx={{ width: `${(keyword.count / maxValue) * 100}%`, justifyContent: "left" }}
            variant="outlined"
            onClick={() => handleClick(keyword.keyword)}
          >
            {keyword.keyword}: {keyword.count}
          </Button>
        ))}
    </Stack>
  );
}

export default KeywordStats;
