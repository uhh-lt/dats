import { TabPanel } from "@mui/lab";
import { UseQueryResult } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import { KeywordStat } from "../../../api/openapi";
import StatsDisplayButton from "./StatsDisplayButton";

interface KeywordStatsProps {
  keywordStats: UseQueryResult<KeywordStat[], Error>;
  handleClick: (keyword: string) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  statsSearchBarValue: string;
}

function KeywordStats({ keywordStats, handleClick, parentRef, statsSearchBarValue }: KeywordStatsProps) {
  // Filter keywordStats results based on search bar value
  let filterKeywordStats:any = keywordStats.data
  if(keywordStats.data!==undefined){
    filterKeywordStats = keywordStats.data.filter((item) => {return item!==undefined && item.keyword.toLowerCase().startsWith(statsSearchBarValue.toLowerCase())})
  }
  if (filterKeywordStats===undefined){
    filterKeywordStats=keywordStats.error?.message
  }

  // render
  return (
    <>
      {keywordStats.isSuccess ? (
        <KeywordStatsContent keywordStats={filterKeywordStats} handleClick={handleClick} parentRef={parentRef} />
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
  parentRef: React.RefObject<HTMLDivElement>;
}

function KeywordStatsContent({ keywordStats, handleClick, parentRef }: KeywordStatsContentProps) {
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: keywordStats.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...keywordStats.map((x) => x.global_count)), [keywordStats]);

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
        return (
          <StatsDisplayButton
            key={virtualItem.key}
            term={keywordStat.keyword}
            count={keywordStat.filtered_count}
            totalCount={keywordStat.global_count}
            maxCount={maxValue}
            translateY={virtualItem.start}
            handleClick={() => handleClick(keywordStat.keyword)}
          />
        );
      })}
    </TabPanel>
  );
}
