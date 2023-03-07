import { Button } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import { SpanEntityDocumentFrequency } from "../../../api/openapi";
import { TabPanel } from "@mui/lab";
import StatsDisplayButton from "./StatsDisplayButton";

interface CodeStatsProps {
  codeId: number;
  codeStats: SpanEntityDocumentFrequency[];
  codeTotalCount: SpanEntityDocumentFrequency[];
  handleClick: (stat: SpanEntityDocumentFrequency) => void;
  parentRef: React.MutableRefObject<undefined>;
}

function CodeStats({ codeId, codeStats, codeTotalCount, handleClick, parentRef }: CodeStatsProps) {
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: codeStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...codeTotalCount.map((x) => x.count)), [codeTotalCount]);

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
      {rowVirtualizer.getVirtualItems().map((virtualItem) => (
        <StatsDisplayButton
          key={virtualItem.key}
          term={codeStats[virtualItem.index].span_text}
          count={codeStats[virtualItem.index].count}
          totalCount={codeTotalCount[virtualItem.index].count}
          maxCount={maxValue}
          translateY={virtualItem.start}
          handleClick={() => handleClick(codeStats[virtualItem.index])}
        />
      ))}
    </TabPanel>
  );
}

export default CodeStats;
