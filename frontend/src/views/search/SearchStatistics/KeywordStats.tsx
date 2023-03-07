import { Button } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import { KeywordStat } from "../../../api/openapi";
import { UseQueryResult } from "@tanstack/react-query";
import { TabPanel } from "@mui/lab";
import StatsDisplayButton from "./StatsDisplayButton";

interface KeywordStatsProps {
  keywordStats: UseQueryResult<KeywordStat[], Error>;
  keywordTotalCount: UseQueryResult<KeywordStat[], Error>;
  handleClick: (keyword: string) => void;
  parentRef: React.MutableRefObject<unknown>;
}

function KeywordStats({ keywordStats, keywordTotalCount, handleClick, parentRef }: KeywordStatsProps) {
  // render
  return (
    <>
      {keywordStats.isSuccess && keywordTotalCount.isSuccess ? (
        <KeywordStatsContent
          keywordStats={keywordStats.data}
          keywordTotalCount={keywordTotalCount.data}
          handleClick={handleClick}
          parentRef={parentRef}
        />
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
  keywordTotalCount: KeywordStat[];
  handleClick: (keyword: string) => void;
  parentRef: React.MutableRefObject<unknown>;
}

function KeywordStatsContent({ keywordStats, keywordTotalCount, handleClick, parentRef }: KeywordStatsContentProps) {
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: keywordStats.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(
    () => (keywordTotalCount ? Math.max(...keywordTotalCount.map((x) => x.count)) : 0),
    [keywordTotalCount]
  );

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
        <StatsDisplayButton
          key={virtualItem.key}
          term={keywordStats[virtualItem.index].keyword}
          count={keywordStats[virtualItem.index].count}
          totalCount={keywordTotalCount[virtualItem.index].count}
          maxCount={maxValue}
          translateY={virtualItem.start}
          handleClick={() => handleClick(keywordStats[virtualItem.index].keyword)}
        />
      ))}
    </TabPanel>
  );
}
