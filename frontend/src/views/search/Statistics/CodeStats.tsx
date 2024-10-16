import { TabPanel } from "@mui/lab";
import { Box, CircularProgress } from "@mui/material";
import { UseQueryResult } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import SearchHooks from "../../../api/SearchHooks.ts";
import { SpanEntityStat } from "../../../api/openapi/models/SpanEntityStat.ts";
import StatsDisplayButton from "./StatsDisplayButton.tsx";
import { useFilterStats } from "./useFilterStats.ts";

interface CodeStatsProps {
  currentTab: string;
  projectId: number;
  codeId: number;
  handleClick: (stat: SpanEntityStat) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

/**
 * The code statistics component.
 * If `sdocIds` is provided, it will filter the code stats by the given sdocIds.
 * Otherwise, it will show the code stats based on search parameters,
 */
function CodeStats({ sdocIds, ...props }: CodeStatsProps & { sdocIds?: number[] }) {
  // rendering
  let content: JSX.Element;
  if (props.currentTab !== `${props.codeId}`) {
    content = <></>;
  } else if (sdocIds) {
    content = <CodeStatsFilter sdocIds={sdocIds} {...props} />;
  } else {
    content = <CodeStatsSearch {...props} />;
  }

  return (
    <TabPanel value={`${props.codeId}`} sx={{ p: 0 }}>
      {content}
    </TabPanel>
  );
}

function CodeStatsFilter({ sdocIds, ...props }: CodeStatsProps & { sdocIds: number[] }) {
  // global server state (react-query)
  const codeStats = SearchHooks.useFilterCodeStats(props.codeId, sdocIds);
  return <CodeStatsLoader codeStats={codeStats} {...props} />;
}

function CodeStatsSearch(props: CodeStatsProps) {
  // global server state (react-query)
  const codeStats = SearchHooks.useSearchCodeStats(props.codeId, props.projectId);
  return <CodeStatsLoader codeStats={codeStats} {...props} />;
}

function CodeStatsLoader({ codeStats, ...props }: CodeStatsProps & { codeStats: UseQueryResult<SpanEntityStat[]> }) {
  if (codeStats.isSuccess) {
    return <CodeStatsWithData codeStats={codeStats.data} {...props} />;
  } else if (codeStats.isLoading) {
    return <CircularProgress />;
  } else if (codeStats.isError) {
    return <>{codeStats.error.message}</>;
  } else {
    return <>Someting went wrong!</>;
  }
}

function CodeStatsWithData({
  codeStats,
  handleClick,
  parentRef,
  filterBy,
}: CodeStatsProps & { codeStats: SpanEntityStat[] }) {
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
