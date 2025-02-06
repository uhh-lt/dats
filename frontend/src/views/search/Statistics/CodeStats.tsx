import { TabPanel } from "@mui/lab";
import { Box, CircularProgress } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import SearchHooks from "../../../api/SearchHooks.ts";
import { SpanEntityStat } from "../../../api/openapi/models/SpanEntityStat.ts";
import StatsDisplayButton from "./StatsDisplayButton.tsx";
import { useFilterStats } from "./useFilterStats.ts";

interface CodeStatsProps {
  currentTab: string;
  codeId: number;
  sdocIds?: number[];
  handleClick: (stat: SpanEntityStat) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

function CodeStats({ sdocIds, codeId, currentTab, ...props }: CodeStatsProps) {
  const codeStats = SearchHooks.useFilterCodeStats(codeId, sdocIds);

  if (currentTab !== `${codeId}`) {
    return null;
  }

  return (
    <TabPanel value={`${codeId}`} sx={{ p: 0 }}>
      {codeStats.isSuccess ? (
        <CodeStatsWithData codeStats={codeStats.data} {...props} />
      ) : codeStats.isLoading && codeStats.isFetching ? (
        <CircularProgress />
      ) : codeStats.isError ? (
        <>{codeStats.error.message}</>
      ) : (
        <>Something went wrong!</>
      )}
    </TabPanel>
  );
}

interface CodeStatsWithDataProps {
  codeStats: SpanEntityStat[];
  handleClick: (stat: SpanEntityStat) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

function CodeStatsWithData({ codeStats, handleClick, parentRef, filterBy }: CodeStatsWithDataProps) {
  const filteredCodeStats = useFilterStats(codeStats, filterBy);
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredCodeStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...filteredCodeStats.map((x) => x.global_count)), [filteredCodeStats]);

  // render
  return (
    <Box
      style={{
        whiteSpace: "nowrap",
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {filteredCodeStats.length === 0 && <i>empty</i>}
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const codeStat = filteredCodeStats[virtualItem.index];

        return (
          <StatsDisplayButton
            key={virtualItem.key}
            term={codeStat.span_text}
            count={codeStat.filtered_count}
            totalCount={codeStat.global_count}
            maxCount={maxValue}
            translateY={virtualItem.start}
            handleClick={() => handleClick(codeStat)}
          />
        );
      })}
    </Box>
  );
}

export default CodeStats;
