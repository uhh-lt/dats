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
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: tagStats.data?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });

  // computed
  const maxValue = useMemo(() => (tagStats.data ? Math.max(...tagStats.data.map((x) => x.count)) : 0), [tagStats.data]);

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
      {tagStats.isSuccess ? (
        <>
          {rowVirtualizer.getVirtualItems().map((virtualItem) => (
            <DocumentTagStatButtonContent
              key={virtualItem.key}
              style={{
                width: `${(tagStats.data[virtualItem.index].count / maxValue) * 100}%`,
                justifyContent: "left",
                position: "absolute",
                top: 0,
                left: 0,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              variant="outlined"
              onClick={() => handleClick(tagStats.data[virtualItem.index].tag.id)}
              tagId={tagStats.data[virtualItem.index].tag.id}
              count={tagStats.data[virtualItem.index].count}
            />
          ))}
        </>
      ) : tagStats.isError ? (
        <div>Error: {tagStats.error.message}</div>
      ) : tagStats.isLoading && tagStats.isFetching ? (
        <div>Loading...</div>
      ) : (
        <></>
      )}
    </TabPanel>
  );
}

export default DocumentTagStats;

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
