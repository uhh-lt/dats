import { TabPanel } from "@mui/lab";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import SearchHooks from "../../../api/SearchHooks.ts";
import { KeywordStat } from "../../../api/openapi/models/KeywordStat.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import StatsDisplayButton from "./StatsDisplayButton.tsx";
import { useFilterStats } from "./useFilterStats.ts";

interface KeywordStatsProps {
  sdocIds: number[];
  handleClick: (keyword: string) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

function KeywordStats({ sdocIds, handleClick, parentRef, filterBy }: KeywordStatsProps) {
  // get the current project id
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.settings.search.sortStatsByGlobal);

  // global server state (react-query)
  const keywordStats = SearchHooks.useSearchKeywordStats(projectId, sdocIds, sortStatsByGlobal);

  // render
  return (
    <>
      {keywordStats.isSuccess ? (
        <KeywordStatsContent
          keywordStats={keywordStats.data}
          handleClick={handleClick}
          parentRef={parentRef}
          filterBy={filterBy}
        />
      ) : keywordStats.isError ? (
        <TabPanel value="keywords" style={{ padding: 0 }}>
          Error: {keywordStats.error.message}
        </TabPanel>
      ) : keywordStats.isLoading && keywordStats.isFetching ? (
        <TabPanel value="keywords" style={{ padding: 0 }}>
          Loading...
        </TabPanel>
      ) : (
        <TabPanel value="keywords" style={{ padding: 0 }}>
          Something went wrong!
        </TabPanel>
      )}
    </>
  );
}

export default KeywordStats;

interface KeywordStatsContentProps {
  keywordStats: KeywordStat[];
  handleClick: (keyword: string) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

function KeywordStatsContent({ keywordStats, handleClick, parentRef, filterBy }: KeywordStatsContentProps) {
  const filteredKeywordStats = useFilterStats(keywordStats, filterBy);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredKeywordStats.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...filteredKeywordStats.map((x) => x.global_count)), [filteredKeywordStats]);

  return (
    <TabPanel
      value="keywords"
      style={{
        whiteSpace: "nowrap",
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
        padding: 0,
      }}
    >
      {filteredKeywordStats.length === 0 && <i>empty</i>}
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const keywordStat = filteredKeywordStats[virtualItem.index];
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
