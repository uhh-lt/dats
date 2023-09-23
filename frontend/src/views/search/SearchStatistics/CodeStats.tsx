import { TabPanel } from "@mui/lab";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import { SpanEntityDocumentFrequency } from "../../../api/openapi";
import StatsDisplayButton from "./StatsDisplayButton";

interface CodeStatsProps {
  codeId: number;
  codeStats: SpanEntityDocumentFrequency[];
  handleClick: (stat: SpanEntityDocumentFrequency) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  statsSearchBarValue: string;
}

function CodeStats({ codeId, codeStats, handleClick, parentRef, statsSearchBarValue }: CodeStatsProps) {
  // Filter codestats results based on search bar value
  let filterCodeStats:any = codeStats
  if(codeStats!==undefined){
    filterCodeStats = codeStats.filter((item) => {return item!==undefined && item.span_text.toLowerCase().startsWith(statsSearchBarValue.toLowerCase())})
  }
  if (filterCodeStats===undefined){
    filterCodeStats=codeStats
  }
  
  codeStats = filterCodeStats

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: codeStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...codeStats.map((x) => x.global_count)), [codeStats]);
  
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
