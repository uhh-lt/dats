import { Button } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import { SpanEntityDocumentFrequency } from "../../../api/openapi";
import { TabPanel } from "@mui/lab";

interface CodeStatsProps {
  codeId: number;
  codeStats: SpanEntityDocumentFrequency[];
  handleClick: (stat: SpanEntityDocumentFrequency) => void;
  parentRef: React.MutableRefObject<undefined>;
}

function CodeStats({ codeId, codeStats, handleClick, parentRef }: CodeStatsProps) {
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: codeStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...codeStats.map((x) => x.count)), [codeStats]);

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
        <Button
          key={virtualItem.key}
          sx={{
            width: `${(codeStats[virtualItem.index].count / maxValue) * 100}%`,
            justifyContent: "left",
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: `translateY(${virtualItem.start}px)`,
          }}
          variant="outlined"
          onClick={() => handleClick(codeStats[virtualItem.index])}
        >
          {codeStats[virtualItem.index].span_text}: {codeStats[virtualItem.index].count}
        </Button>
      ))}
    </TabPanel>
  );
}

export default CodeStats;
