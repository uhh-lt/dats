import { Button, ButtonProps } from "@mui/material";
import React, { useMemo } from "react";
import TagHooks from "../../../api/TagHooks";
import { TagStat } from "../../../api/openapi";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TabPanel } from "@mui/lab";
import { UseQueryResult } from "@tanstack/react-query";

interface DocumentTagStatsProps {
  tagStats: UseQueryResult<TagStat[], Error>;
  handleClick: (tagId: number) => void;
  parentRef: React.MutableRefObject<undefined>;
}

function DocumentTagStats({ tagStats, handleClick, parentRef }: DocumentTagStatsProps) {
  return (
    <>
      {tagStats.isSuccess ? (
        <DocumentTagStatsContent tagStats={tagStats.data} handleClick={handleClick} parentRef={parentRef} />
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
  parentRef: React.MutableRefObject<undefined>;
}

function DocumentTagStatsContent({ tagStats, handleClick, parentRef }: DocumentTagStatsContentProps) {
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: tagStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });

  // computed
  const maxValue = useMemo(() => (tagStats ? Math.max(...tagStats.map((x) => x.count)) : 0), [tagStats]);

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
          key={virtualItem.key}
          style={{
            width: `${(tagStats[virtualItem.index].count / maxValue) * 100}%`,
            justifyContent: "left",
            position: "absolute",
            top: 0,
            left: 0,
            transform: `translateY(${virtualItem.start}px)`,
          }}
          variant="outlined"
          onClick={() => handleClick(tagStats[virtualItem.index].tag.id)}
          tagId={tagStats[virtualItem.index].tag.id}
          count={tagStats[virtualItem.index].count}
        />
      ))}
    </TabPanel>
  );
}

function DocumentTagStatButtonContent({ tagId, count, ...props }: { tagId: number; count: number } & ButtonProps) {
  const tag = TagHooks.useGetTag(tagId);

  return (
    <Button {...props} disabled={!tag.isSuccess}>
      {tag.isLoading && <>Loading...: {count}</>}
      {tag.isError && <>{tag.error.message} </>}
      {tag.isSuccess && (
        <>
          {tag.data.title}: {count}
        </>
      )}
    </Button>
  );
}
