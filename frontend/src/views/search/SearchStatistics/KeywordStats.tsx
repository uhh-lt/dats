import { Button } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import { KeywordStat } from "../../../api/openapi";
import { UseQueryResult } from "@tanstack/react-query";
import { TabPanel } from "@mui/lab";

interface KeywordStatsProps {
  keywordStats: UseQueryResult<KeywordStat[], Error>;
  handleClick: (keyword: string) => void;
  parentRef: React.MutableRefObject<undefined>;
}

function KeywordStats({ keywordStats, handleClick, parentRef }: KeywordStatsProps) {
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: keywordStats.data?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });

  // computed
  const maxValue = useMemo(
    () => (keywordStats.data ? Math.max(...keywordStats.data.map((x) => x.count)) : 0),
    [keywordStats.data]
  );

  // render
  return (
    <TabPanel
      value="keywords"
      style={{
        whiteSpace: "nowrap",
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {keywordStats.isSuccess ? (
        <>
          {rowVirtualizer.getVirtualItems().map((virtualItem) => (
            <Button
              key={virtualItem.key}
              sx={{
                width: `${(keywordStats.data[virtualItem.index].count / maxValue) * 100}%`,
                justifyContent: "left",
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              variant="outlined"
              onClick={() => handleClick(keywordStats.data[virtualItem.index].keyword)}
            >
              {keywordStats.data[virtualItem.index].keyword}: {keywordStats.data[virtualItem.index].count}
            </Button>
          ))}
        </>
      ) : keywordStats.isError ? (
        <div>Error: {keywordStats.error.message}</div>
      ) : keywordStats.isLoading && keywordStats.isFetching ? (
        <div>Loading...</div>
      ) : (
        <></>
      )}
    </TabPanel>
  );
}

export default KeywordStats;
