import { StatisticsHooks } from "@api/hooks/StatisticsHooks";
import { StatsDisplayButton } from "@components/StatsDisplayButton";
import { SpanEntityStat } from "@models/SpanEntityStat";
import { TabPanel } from "@mui/lab";
import { Box, CircularProgress } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo } from "react";
import { useFilterStats } from "../_hooks/useFilterStats";

interface CodeStatsProps {
  currentTab: string;
  codeId: number;
  sdocIds?: number[];
  handleClick: (stat: SpanEntityStat) => void;
  parentElement: HTMLDivElement | null;
  filterBy: string;
}

export function CodeStats(props: CodeStatsProps) {
  if (props.currentTab !== `${props.codeId}`) {
    return null;
  } else {
    return <CodeStatsContent {...props} />;
  }
}

function CodeStatsContent({ codeId, sdocIds, ...props }: CodeStatsProps) {
  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);
  const codeStats = StatisticsHooks.useFilterCodeStats(codeId, sdocIds, sortStatsByGlobal);
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
  parentElement: HTMLDivElement | null;
  filterBy: string;
}

function CodeStatsWithData({ codeStats, handleClick, parentElement, filterBy }: CodeStatsWithDataProps) {
  const filteredCodeStats = useFilterStats(codeStats, filterBy);
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredCodeStats.length,
    getScrollElement: () => parentElement,
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
