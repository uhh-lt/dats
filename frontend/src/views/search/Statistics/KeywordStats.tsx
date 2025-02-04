import { TabPanel } from "@mui/lab";
import { UseQueryResult } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import SearchHooks from "../../../api/SearchHooks.ts";
import { KeywordStat } from "../../../api/openapi/models/KeywordStat.ts";
import StatsDisplayButton from "./StatsDisplayButton.tsx";
import { useFilterStats } from "./useFilterStats.ts";

interface KeywordStatsProps {
  projectId: number;
  handleClick: (keyword: string) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

/**
 * The keyword statistics component.
 * If `sdocIds` is provided, it will filter the keyword stats by the given sdocIds.
 * Otherwise, it will show the keyword stats based on search parameters,
 */
function KeywordStats({ sdocIds, ...props }: KeywordStatsProps & { sdocIds?: number[] }) {
  if (sdocIds) {
    return <KeywordStatsFilter sdocIds={sdocIds} {...props} />;
  } else {
    return <KeywordStatsSearch {...props} />;
  }
}

function KeywordStatsFilter({ sdocIds, ...props }: KeywordStatsProps & { sdocIds: number[] }) {
  // global server state (react-query)
  const keywordStats = SearchHooks.useFilterKeywordStats(props.projectId, sdocIds);
  return <KeywordStatsLoader keywordStats={keywordStats} {...props} />;
}

function KeywordStatsSearch(props: KeywordStatsProps) {
  // global server state (react-query)
  const keywordStats = SearchHooks.useSearchKeywordStats(props.projectId);
  return <KeywordStatsLoader keywordStats={keywordStats} {...props} />;
}

function KeywordStatsLoader({
  keywordStats,
  ...props
}: KeywordStatsProps & { keywordStats: UseQueryResult<KeywordStat[]> }) {
  return (
    <>
      {keywordStats.isSuccess ? (
        <KeywordStatsContent keywordStats={keywordStats.data} {...props} />
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

export default KeywordStats;
