import { Box } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";
import { SpanEntityStat } from "../../../../../api/openapi/models/SpanEntityStat.ts";
import { StatisticsHooks } from "../../../../../api/StatisticsHooks.ts";
import { StatsDisplayButton } from "../../../../search/Statistics/StatsDisplayButton.tsx";

interface MapCodeStatsProps {
  codeId: number;
  sdocIds?: number[];
  handleClick: (stat: SpanEntityStat) => void;
}

export function MapCodeStats({ codeId, sdocIds, ...props }: MapCodeStatsProps) {
  const codeStats = StatisticsHooks.useFilterCodeStats(codeId, sdocIds);
  return (
    <>
      {codeStats.isSuccess ? (
        <MapCodeStatsWithData codeStats={codeStats.data} {...props} />
      ) : codeStats.isError ? (
        <Box>Error: {codeStats.error.message}</Box>
      ) : codeStats.isLoading && codeStats.isFetching ? (
        <Box>Loading...</Box>
      ) : (
        <Box>Something went wrong!</Box>
      )}
    </>
  );
}

interface MapCodeStatsWithDataProps {
  codeStats: SpanEntityStat[];
  handleClick: (stat: SpanEntityStat) => void;
}

function MapCodeStatsWithData({ codeStats, handleClick }: MapCodeStatsWithDataProps) {
  // The scrollable element for the lists
  const parentRef = useRef<HTMLDivElement>(null);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: codeStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  console.log(codeStats);

  // computed
  const maxValue = useMemo(() => Math.max(...codeStats.map((x) => x.global_count)), [codeStats]);

  // render
  return (
    <Box
      ref={parentRef}
      style={{
        height: `${rowVirtualizer.getTotalSize() || 30}px`,
        position: "relative",
      }}
    >
      {codeStats.length === 0 && <i>empty</i>}
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const codeStat = codeStats[virtualItem.index];
        return (
          <StatsDisplayButton
            key={virtualItem.key}
            term={codeStat.span_text}
            count={codeStat.filtered_count}
            totalCount={codeStat.global_count}
            maxCount={maxValue}
            translateY={virtualItem.start}
            handleClick={() => handleClick(codeStat)}
            tooltipPlacement="left"
          />
        );
      })}
    </Box>
  );
}
