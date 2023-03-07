import { Button, ButtonProps } from "@mui/material";
import React, { useMemo } from "react";
import TagHooks from "../../../api/TagHooks";
import { DocumentTagRead, TagStat } from "../../../api/openapi";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TabPanel } from "@mui/lab";
import { UseQueryResult } from "@tanstack/react-query";
import StatsDisplayButton, { StatsDisplayButtonProps } from "./StatsDisplayButton";

interface DocumentTagStatsProps {
  tagStats: UseQueryResult<TagStat[], Error>;
  tagTotalCount: UseQueryResult<TagStat[], Error>;
  handleClick: (tagId: number) => void;
  parentRef: React.MutableRefObject<undefined>;
}

function DocumentTagStats({ tagStats, tagTotalCount, handleClick, parentRef }: DocumentTagStatsProps) {
  return (
    <>
      {tagStats.isSuccess && tagTotalCount.isSuccess ? (
        <DocumentTagStatsContent
          tagStats={tagStats.data}
          tagTotalCount={tagTotalCount.data}
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
  tagTotalCount: TagStat[];
  handleClick: (tagId: number) => void;
  parentRef: React.MutableRefObject<undefined>;
}

function DocumentTagStatsContent({ tagStats, tagTotalCount, handleClick, parentRef }: DocumentTagStatsContentProps) {
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: tagStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => (tagTotalCount ? Math.max(...tagTotalCount.map((x) => x.count)) : 0), [tagTotalCount]);

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
      {rowVirtualizer.getVirtualItems().map((virtualItem) => (
        <DocumentTagStatButtonContent
          tagId={tagStats[virtualItem.index].tag.id}
          key={virtualItem.key}
          term={""}
          count={tagStats[virtualItem.index].count}
          totalCount={tagTotalCount[virtualItem.index].count}
          maxCount={maxValue}
          translateY={virtualItem.start}
          handleClick={() => handleClick(tagStats[virtualItem.index].tag.id)}
        />
      ))}
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
