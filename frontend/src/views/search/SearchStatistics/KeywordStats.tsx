import { TabPanel } from "@mui/lab";
import { UseQueryResult } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import { KeywordStat } from "../../../api/openapi";
import StatsDisplayButton from "./StatsDisplayButton";

interface KeywordStatsProps {
  keywordStats: UseQueryResult<KeywordStat[], Error>;
  keywordTotalCountMap: Map<string, number>;
  handleClick: (keyword: string) => void;
  parentRef: React.MutableRefObject<unknown>;
}

function KeywordStats({ keywordStats, keywordTotalCountMap, handleClick, parentRef }: KeywordStatsProps) {
  // render
  return (
    <>
      {keywordStats.isSuccess ? (
        <KeywordStatsContent
          keywordStats={keywordStats.data}
          keywordTotalCountMap={keywordTotalCountMap}
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
  keywordTotalCountMap: Map<string, number>;
  handleClick: (keyword: string) => void;
  parentRef: React.MutableRefObject<unknown>;
}

function KeywordStatsContent({ keywordStats, keywordTotalCountMap, handleClick, parentRef }: KeywordStatsContentProps) {
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: keywordStats.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...Array.from(keywordTotalCountMap.values())), [keywordTotalCountMap]);

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
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        let keywordStat = keywordStats[virtualItem.index];

        if (keywordTotalCountMap.has(keywordStat.keyword)) {
          return (
            <StatsDisplayButton
              key={virtualItem.key}
              term={keywordStat.keyword}
              count={keywordStat.count}
              totalCount={keywordTotalCountMap.get(keywordStat.keyword)!}
              maxCount={maxValue}
              translateY={virtualItem.start}
              handleClick={() => handleClick(keywordStat.keyword)}
            />
          );
        }
        return (
          <div
            key={virtualItem.key}
            style={{
              width: "100%",
              height: 30,
              position: "absolute",
              top: 0,
              left: 0,
              transform: `translateY(${virtualItem.start}px)`,

              display: "flex",
              alignItems: "center",
            }}
          >
            {keywordStat.keyword}: {keywordStat.count} No total count... Why?
          </div>
        );
      })}
    </TabPanel>
  );
}
