import { TabPanel } from "@mui/lab";
import { UseQueryResult } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import { DocumentTagRead, TagStat } from "../../../api/openapi";
import TagHooks from "../../../api/TagHooks";
import StatsDisplayButton, { StatsDisplayButtonProps } from "./StatsDisplayButton";

interface DocumentTagStatsProps {
  tagStats: UseQueryResult<TagStat[], Error>;
  tagTotalCountMap: Map<number, number>;
  handleClick: (tagId: number) => void;
  parentRef: React.RefObject<HTMLDivElement>;
}

function DocumentTagStats({ tagStats, tagTotalCountMap, handleClick, parentRef }: DocumentTagStatsProps) {
  return (
    <>
      {tagStats.isSuccess ? (
        <DocumentTagStatsContent
          tagStats={tagStats.data}
          tagTotalCountMap={tagTotalCountMap}
          handleClick={handleClick}
          parentRef={parentRef}
        />
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
  tagTotalCountMap: Map<number, number>;
  handleClick: (tagId: number) => void;
  parentRef: React.RefObject<HTMLDivElement>;
}

function DocumentTagStatsContent({ tagStats, tagTotalCountMap, handleClick, parentRef }: DocumentTagStatsContentProps) {
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: tagStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...Array.from(tagTotalCountMap.values())), [tagTotalCountMap]);

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

        if (tagTotalCountMap.has(tagStat.tag.id)) {
          return (
            <DocumentTagStatButtonContent
              tagId={tagStat.tag.id}
              key={virtualItem.key}
              term={""}
              count={tagStat.count}
              totalCount={tagTotalCountMap.get(tagStat.tag.id)!}
              maxCount={maxValue}
              translateY={virtualItem.start}
              handleClick={() => handleClick(tagStat.tag.id)}
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
            {tagStat.tag.title}: {tagStat.count} No total count... Why?
          </div>
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
