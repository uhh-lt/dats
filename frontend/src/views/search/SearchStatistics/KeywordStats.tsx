import { Button } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import { KeywordStat } from "../../../api/openapi";
import { UseQueryResult } from "@tanstack/react-query";
import { TabPanel } from "@mui/lab";

interface KeywordStatsProps {
  keywordStats: UseQueryResult<KeywordStat[], Error>;
  handleClick: (keyword: string) => void;
  parentRef: React.MutableRefObject<unknown>;
}

function KeywordStats({ keywordStats, handleClick, parentRef }: KeywordStatsProps) {
  // render
  return (
    <>
      {keywordStats.isSuccess ? (
        <KeywordStatsContent keywordStats={keywordStats.data} handleClick={handleClick} parentRef={parentRef} />
      ) : keywordStats.isError ? (
        <TabPanel value="keywords">Error: {keywordStats.error.message}</TabPanel>
      ) : keywordStats.isLoading && keywordStats.isFetching ? (
        <TabPanel value="keywords">Loading...</TabPanel>
      ) : (
        <></>
      )}
    </>
  );
}

export default KeywordStats;

interface KeywordStatsContentProps {
  keywordStats: KeywordStat[];
  handleClick: (keyword: string) => void;
  parentRef: React.MutableRefObject<unknown>;
}

function KeywordStatsContent({ keywordStats, handleClick, parentRef }: KeywordStatsContentProps) {
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: keywordStats.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });

  // computed
  const maxValue = useMemo(() => (keywordStats ? Math.max(...keywordStats.map((x) => x.count)) : 0), [keywordStats]);

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
      {rowVirtualizer.getVirtualItems().map((virtualItem) => (
        <Button
          key={virtualItem.key}
          sx={{
            width: `${(keywordStats[virtualItem.index].count / maxValue) * 100}%`,
            justifyContent: "left",
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: `translateY(${virtualItem.start}px)`,
          }}
          variant="outlined"
          onClick={() => handleClick(keywordStats[virtualItem.index].keyword)}
        >
          {keywordStats[virtualItem.index].keyword}: {keywordStats[virtualItem.index].count}
        </Button>
      ))}
    </TabPanel>
  );
}
