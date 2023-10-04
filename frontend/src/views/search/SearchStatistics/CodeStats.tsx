import { TabPanel } from "@mui/lab";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import { SpanEntityDocumentFrequency } from "../../../api/openapi";
import StatsDisplayButton from "./StatsDisplayButton";
import { useFilterStats } from "../hooks/useFilterStats";

interface CodeStatsProps {
  codeId: number;
  codeStats: SpanEntityDocumentFrequency[];
  handleClick: (stat: SpanEntityDocumentFrequency) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

function CodeStats({ codeId, codeStats, handleClick, parentRef, filterBy }: CodeStatsProps) {
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
    <TabPanel
      value={`${codeId}`}
      style={{
        whiteSpace: "nowrap",
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
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
    </TabPanel>
  );
}

export default CodeStats;
