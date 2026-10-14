import { StatsDisplayButton, StatsDisplayButtonProps } from "@components/StatsDisplayButton";
import { statisticsQueries } from "@core/statistics";
import { TagHooks } from "@core/tag";
import { TagStat } from "@models/TagStat";
import { useQuery } from "@tanstack/react-query";

import { Box } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";

interface MapTagStatsProps {
  projectId: number;
  sdocIds?: number[];
  handleClick: (tagId: number) => void;
}

export function MapTagStats(props: MapTagStatsProps) {
  const sortStatsByGlobal = useAppSelector((state) => state.perspectives.sortStatsByGlobal);
  const tagStatsQuery = useQuery(statisticsQueries.tagStats(props.sdocIds, sortStatsByGlobal));
  return (
    <>
      {tagStatsQuery.isSuccess ? (
        <MapTagStatsWithData tagStats={tagStatsQuery.data} {...props} />
      ) : tagStatsQuery.isError ? (
        <Box>Error: {tagStatsQuery.error.message}</Box>
      ) : tagStatsQuery.isLoading && tagStatsQuery.isFetching ? (
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
