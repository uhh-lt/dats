import { Box } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";
import { KeywordStat } from "../../../../../api/openapi/models/KeywordStat.ts";
import { StatisticsHooks } from "../../../../../api/StatisticsHooks.ts";
import { StatsDisplayButton } from "../../../../search/Statistics/StatsDisplayButton.tsx";

interface MapKeywordStatsProps {
  sdocIds?: number[];
  projectId: number;
  handleClick: (keyword: string) => void;
}

export function MapKeywordStats({ projectId, sdocIds, ...props }: MapKeywordStatsProps) {
  const keywordStats = StatisticsHooks.useFilterKeywordStats(projectId, sdocIds);
  return (
    <>
      {keywordStats.isSuccess ? (
        <MapKeywordStatsWithData keywordStats={keywordStats.data} {...props} />
      ) : keywordStats.isError ? (
        <Box>Error: {keywordStats.error.message}</Box>
      ) : keywordStats.isLoading && keywordStats.isFetching ? (
        <Box>Loading...</Box>
      ) : (
        <Box>Something went wrong!</Box>
      )}
    </>
  );
}

interface KeywordStatsContentProps {
  keywordStats: KeywordStat[];
  handleClick: (keyword: string) => void;
}

function MapKeywordStatsWithData({ keywordStats, handleClick }: KeywordStatsContentProps) {
  // The scrollable element for the lists
  const parentRef = useRef<HTMLDivElement>(null);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: keywordStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...keywordStats.map((x) => x.global_count)), [keywordStats]);

  return (
    <Box
      ref={parentRef}
      style={{
        height: `${rowVirtualizer.getTotalSize() || 30}px`,
        position: "relative",
      }}
    >
      {keywordStats.length === 0 && <i>empty</i>}
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const keywordStat = keywordStats[virtualItem.index];
        return (
          <StatsDisplayButton
            key={virtualItem.key}
            term={keywordStat.keyword}
            count={keywordStat.filtered_count}
            totalCount={keywordStat.global_count}
            maxCount={maxValue}
            translateY={virtualItem.start}
            handleClick={() => handleClick(keywordStat.keyword)}
            tooltipPlacement="left"
          />
        );
      })}
    </Box>
  );
}
