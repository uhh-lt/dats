import { TabPanel } from "@mui/lab";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import StatsDisplayButton from "./StatsDisplayButton";
import { useFilterStats } from "../hooks/useFilterStats";
import { SpanEntityStat } from "../../../api/openapi";
import SearchHooks from "../../../api/SearchHooks";
import { useAuth } from "../../../auth/AuthProvider";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { Box, CircularProgress } from "@mui/material";

interface CodeStatsProps {
  currentTab: string;
  codeId: number;
  sdocIds: number[];
  handleClick: (stat: SpanEntityStat) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

function CodeStats(props: CodeStatsProps) {
  // rendering
  let content: JSX.Element;
  if (props.currentTab !== `${props.codeId}`) {
    content = <></>;
  } else {
    content = <CodeStatsWithoutData {...props} />;
  }

  return (
    <TabPanel value={`${props.codeId}`} sx={{ p: 0 }}>
      {content}
    </TabPanel>
  );
}

function CodeStatsWithoutData(props: CodeStatsProps) {
  // global client state
  const { user } = useAuth();

  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.settings.search.sortStatsByGlobal);

  // global server state (react-query)
  const codeStats = SearchHooks.useSearchCodeStats(props.codeId, user.data?.id, props.sdocIds, sortStatsByGlobal);

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
  codeId,
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
        let codeStat = filteredCodeStats[virtualItem.index];

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
