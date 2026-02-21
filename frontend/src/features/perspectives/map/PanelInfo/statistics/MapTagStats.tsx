import { Box } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";
import { TagStat } from "../../../../../api/openapi/models/TagStat.ts";
import { StatisticsHooks } from "../../../../../api/StatisticsHooks.ts";
import { TagHooks } from "../../../../../api/TagHooks.ts";
import { StatsDisplayButton, StatsDisplayButtonProps } from "../../../../search/Statistics/StatsDisplayButton.tsx";

interface MapTagStatsProps {
  projectId: number;
  sdocIds?: number[];
  handleClick: (tagId: number) => void;
}

export function MapTagStats(props: MapTagStatsProps) {
  const tagStats = StatisticsHooks.useFilterTagStats(props.sdocIds);
  return (
    <>
      {tagStats.isSuccess ? (
        <MapTagStatsWithData tagStats={tagStats.data} {...props} />
      ) : tagStats.isError ? (
        <Box>Error: {tagStats.error.message}</Box>
      ) : tagStats.isLoading && tagStats.isFetching ? (
        <Box>Loading...</Box>
      ) : (
        <Box>Something went wrong!</Box>
      )}
    </>
  );
}

function MapTagStatsWithData({ tagStats, handleClick }: MapTagStatsProps & { tagStats: TagStat[] }) {
  // The scrollable element for the lists
  const parentRef = useRef<HTMLDivElement>(null);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: tagStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...tagStats.map((t) => t.global_count)), [tagStats]);

  return (
    <Box
      ref={parentRef}
      style={{
        height: `${rowVirtualizer.getTotalSize() || 30}px`,
        position: "relative",
      }}
    >
      {tagStats.length === 0 && <i>empty</i>}
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const tagStat = tagStats[virtualItem.index];
        return (
          <DocumentTagStatButtonContent
            tagId={tagStat.tag.id}
            key={virtualItem.key}
            count={tagStat.filtered_count}
            totalCount={tagStat.global_count}
            maxCount={maxValue}
            translateY={virtualItem.start}
            handleClick={() => handleClick(tagStat.tag.id)}
          />
        );
      })}
    </Box>
  );
}

function DocumentTagStatButtonContent({
  tagId,
  ...props
}: { tagId: number } & Omit<StatsDisplayButtonProps, "term" | "disabled">) {
  const tag = TagHooks.useGetTag(tagId);

  return (
    <StatsDisplayButton
      {...props}
      tooltipPlacement="left"
      disabled={!tag.isSuccess}
      term={tag.isSuccess ? tag.data.name : tag.isLoading ? "Loading..." : tag.isError ? tag.error.message : "Error"}
    />
  );
}
