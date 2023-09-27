import { TabPanel } from "@mui/lab";
import { UseQueryResult } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import { DocumentTagRead, TagStat } from "../../../api/openapi";
import TagHooks from "../../../api/TagHooks";
import StatsDisplayButton, { StatsDisplayButtonProps } from "./StatsDisplayButton";

interface DocumentTagStatsProps {
  tagStats: UseQueryResult<TagStat[], Error>;
  handleClick: (tagId: number) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filteredStatsData: TagStat[];
}

function DocumentTagStats({ tagStats, handleClick, parentRef, filteredStatsData }: DocumentTagStatsProps) {
  return (
    <>
      {tagStats.isSuccess ? (
        <DocumentTagStatsContent tagStats={filteredStatsData} handleClick={handleClick} parentRef={parentRef} />
      ) : tagStats.isError ? (
        <TabPanel value="tags">Error: {tagStats.error.message}</TabPanel>
      ) : tagStats.isLoading && tagStats.isFetching ? (
        <TabPanel value="tags">Loading...</TabPanel>
      ) : (
        <></>
      )}
    </>
  );
}

export default DocumentTagStats;

interface DocumentTagStatsContentProps {
  tagStats: TagStat[];
  handleClick: (tagId: number) => void;
  parentRef: React.RefObject<HTMLDivElement>;
}

function DocumentTagStatsContent({ tagStats, handleClick, parentRef }: DocumentTagStatsContentProps) {
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: tagStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...tagStats.map((t) => t.global_count)), [tagStats]);

  return (
    <TabPanel
      value="tags"
      style={{
        whiteSpace: "nowrap",
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        let tagStat = tagStats[virtualItem.index];
        return (
          <DocumentTagStatButtonContent
            tagId={tagStat.tag.id}
            key={virtualItem.key}
            term={""}
            count={tagStat.filtered_count}
            totalCount={tagStat.global_count}
            maxCount={maxValue}
            translateY={virtualItem.start}
            handleClick={() => handleClick(tagStat.tag.id)}
          />
        );
      })}
    </TabPanel>
  );
}

function DocumentTagStatButtonContent({ tagId, ...props }: { tagId: number } & StatsDisplayButtonProps) {
  const tag: UseQueryResult<DocumentTagRead, Error> = TagHooks.useGetTag(tagId);

  return (
    <StatsDisplayButton
      {...props}
      disabled={!tag.isSuccess}
      term={tag.isLoading ? "Loading..." : tag.isError ? tag.error.message : tag.data.title}
    />
  );
}
