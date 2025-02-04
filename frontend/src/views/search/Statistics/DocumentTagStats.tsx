import { TabPanel } from "@mui/lab";
import { UseQueryResult } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import SearchHooks from "../../../api/SearchHooks.ts";
import TagHooks from "../../../api/TagHooks.ts";
import { TagStat } from "../../../api/openapi/models/TagStat.ts";
import StatsDisplayButton, { StatsDisplayButtonProps } from "./StatsDisplayButton.tsx";
import { useFilterStats } from "./useFilterStats.ts";

interface DocumentTagStatsProps {
  projectId: number;
  handleClick: (tagId: number) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

/**
 * The tag statistics component.
 * If `sdocIds` is provided, it will filter the tag stats by the given sdocIds.
 * Otherwise, it will show the tag stats based on search parameters,
 */
function DocumentTagStats({ sdocIds, ...props }: DocumentTagStatsProps & { sdocIds?: number[] }) {
  if (sdocIds) {
    return <DocumentTagStatsFilter sdocIds={sdocIds} {...props} />;
  } else {
    return <DocumentTagStatsSearch {...props} />;
  }
}

function DocumentTagStatsFilter({ sdocIds, ...props }: DocumentTagStatsProps & { sdocIds: number[] }) {
  // global server state (react-query)
  const tagStats = SearchHooks.useFilterTagStats(sdocIds);
  return <DocumentTagStatsLoader tagStats={tagStats} {...props} />;
}

function DocumentTagStatsSearch(props: DocumentTagStatsProps) {
  // global server state (react-query)
  const tagStats = SearchHooks.useSearchTagStats(props.projectId);
  return <DocumentTagStatsLoader tagStats={tagStats} {...props} />;
}

function DocumentTagStatsLoader({
  tagStats,
  ...props
}: DocumentTagStatsProps & { tagStats: UseQueryResult<TagStat[]> }) {
  return (
    <>
      {tagStats.isSuccess ? (
        <DocumentTagStatsContent tagStats={tagStats.data} {...props} />
      ) : tagStats.isError ? (
        <TabPanel value="tags" style={{ padding: 0 }}>
          Error: {tagStats.error.message}
        </TabPanel>
      ) : tagStats.isLoading && tagStats.isFetching ? (
        <TabPanel value="tags" style={{ padding: 0 }}>
          Loading...
        </TabPanel>
      ) : (
        <TabPanel value="tags" style={{ padding: 0 }}>
          Something went wrong!
        </TabPanel>
      )}
    </>
  );
}

export default DocumentTagStats;

function DocumentTagStatsContent({
  tagStats,
  handleClick,
  parentRef,
  filterBy,
}: DocumentTagStatsProps & { tagStats: TagStat[] }) {
  const filteredTagStats = useFilterStats(tagStats, filterBy);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredTagStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...filteredTagStats.map((t) => t.global_count)), [filteredTagStats]);

  return (
    <TabPanel
      value="tags"
      style={{
        whiteSpace: "nowrap",
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
        padding: 0,
      }}
    >
      {filteredTagStats.length === 0 && <i>empty</i>}
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const tagStat = filteredTagStats[virtualItem.index];
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
  const tag = TagHooks.useGetTag(tagId);

  return (
    <StatsDisplayButton
      {...props}
      disabled={!tag.isSuccess}
      term={tag.isSuccess ? tag.data.name : tag.isLoading ? "Loading..." : tag.isError ? tag.error.message : "Error"}
    />
  );
}
