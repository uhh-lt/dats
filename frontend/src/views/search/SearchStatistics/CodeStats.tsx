import { TabPanel } from "@mui/lab";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import { SpanEntityDocumentFrequency } from "../../../api/openapi";
import StatsDisplayButton from "./StatsDisplayButton";

interface CodeStatsProps {
  codeId: number;
  codeStats: SpanEntityDocumentFrequency[];
  entityTotalCountMap: Map<string, number>;
  handleClick: (stat: SpanEntityDocumentFrequency) => void;
  parentRef: React.MutableRefObject<undefined>;
}

function CodeStats({ codeId, codeStats, entityTotalCountMap, handleClick, parentRef }: CodeStatsProps) {
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: codeStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...Array.from(entityTotalCountMap.values())), [entityTotalCountMap]);

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
        let codeStat = codeStats[virtualItem.index];

        return (
          <StatsDisplayButton
            key={virtualItem.key}
            term={codeStat.span_text}
            count={codeStat.count}
            totalCount={entityTotalCountMap.get(codeStat.span_text)!}
            maxCount={maxValue}
            translateY={virtualItem.start}
            handleClick={() => handleClick(codeStat)}
          />
        );
      })}

      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        let codeStat = codeStats[virtualItem.index];

        if (entityTotalCountMap.has(codeStat.span_text)) {
          return (
            <StatsDisplayButton
              key={virtualItem.key}
              term={codeStat.span_text}
              count={codeStat.count}
              totalCount={entityTotalCountMap.get(codeStat.span_text)!}
              maxCount={maxValue}
              translateY={virtualItem.start}
              handleClick={() => handleClick(codeStat)}
            />
          );
        }
        return (
          <div
            key={virtualItem.key}
            style={{
              width: "100%",
              height: 30,
              position: "absolute",
              top: 0,
              left: 0,
              transform: `translateY(${virtualItem.start}px)`,
              display: "flex",
              alignItems: "center",
            }}
          >
            {codeStat.span_text}: {codeStat.count} No total count... Why?
          </div>
        );
      })}
    </TabPanel>
  );
}

export default CodeStats;
