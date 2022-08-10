import { Button, Stack } from "@mui/material";
import React, { useMemo } from "react";
import SearchHooks from "../../../api/SearchHooks";
import { useParams } from "react-router-dom";
import { KeywordStat } from "../../../api/openapi";

interface KeywordStatsProps {
  documentIds: number[];
  handleClick: (keyword: string) => void;
}

function KeywordStats({ documentIds, handleClick }: KeywordStatsProps) {
  // get the current project id
  const { projectId } = useParams() as { projectId: string };

  const keywords = SearchHooks.useSearchKeywordStats(parseInt(projectId), documentIds);
  const maxValue = useMemo(() => (keywords.isSuccess ? Math.max(...keywords.data.map((x) => x.count)) : 0), [keywords]);

  // render
  if (keywords.isSuccess) {
    return (
      <Stack sx={{ whiteSpace: "nowrap" }} spacing={0.5}>
        {keywords.data
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

  if (keywords.isError) {
    return <div>Error: {keywords.error.message}</div>;
  }

  if (keywords.isLoading && keywords.isFetching) {
    return <div>Loading...</div>;
  }

  return <></>;
}

export default KeywordStats;
