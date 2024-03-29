import { TabPanel } from "@mui/lab";
import { UseQueryResult } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import SearchHooks from "../../../api/SearchHooks";
import TagHooks from "../../../api/TagHooks";
import { DocumentTagRead, TagStat } from "../../../api/openapi";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { useFilterStats } from "../hooks/useFilterStats";
import StatsDisplayButton, { StatsDisplayButtonProps } from "./StatsDisplayButton";

interface DocumentTagStatsProps {
  sdocIds: number[];
  handleClick: (tagId: number) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

function DocumentTagStats({ sdocIds, handleClick, parentRef, filterBy }: DocumentTagStatsProps) {
  // global client state (redux)
  const sortStatsByGlobal = useAppSelector((state) => state.settings.search.sortStatsByGlobal);

  // global server state (react-query)
  const tagStats = SearchHooks.useSearchTagStats(sdocIds, sortStatsByGlobal);

  return (
    <>
      {tagStats.isSuccess ? (
        <DocumentTagStatsContent
          tagStats={tagStats.data}
          handleClick={handleClick}
          parentRef={parentRef}
          filterBy={filterBy}
        />
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

interface DocumentTagStatsContentProps {
  tagStats: TagStat[];
  handleClick: (tagId: number) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

function DocumentTagStatsContent({ tagStats, handleClick, parentRef, filterBy }: DocumentTagStatsContentProps) {
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
        let tagStat = filteredTagStats[virtualItem.index];
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
