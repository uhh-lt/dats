import { StatisticsHooks } from "@api/hooks/StatisticsHooks";
import { KeywordStat } from "@api/models/KeywordStat";
import { StatsDisplayButton } from "@components/StatsDisplayButton";
import { TabPanel } from "@mui/lab";
import { useAppSelector } from "@store/storeHooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo } from "react";
import { useFilterStats } from "../_hooks/useFilterStats";

interface KeywordStatsProps {
  currentTab: string;
  sdocIds?: number[];
  projectId: number;
  handleClick: (keyword: string) => void;
  parentElement: HTMLDivElement | null;
  filterBy: string;
}

export function KeywordStats(props: KeywordStatsProps) {
  if (props.currentTab !== `keywords`) {
    return null;
  } else {
    return <KeywordStatsContent {...props} />;
  }
}

function KeywordStatsContent({ projectId, sdocIds, ...props }: KeywordStatsProps) {
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);
  const keywordStats = StatisticsHooks.useFilterKeywordStats(projectId, sdocIds, sortStatsByGlobal);
  return (
    <>
      {keywordStats.isSuccess ? (
        <KeywordStatsWithData keywordStats={keywordStats.data} {...props} />
      ) : keywordStats.isError ? (
        <TabPanel value="keywords" style={{ padding: 0 }}>
          Error: {keywordStats.error.message}
        </TabPanel>
      ) : keywordStats.isLoading && keywordStats.isFetching ? (
        <TabPanel value="keywords" style={{ padding: 0 }}>
          Loading...
        </TabPanel>
      ) : (
        <TabPanel value="keywords" style={{ padding: 0 }}>
          Something went wrong!
        </TabPanel>
      )}
    </>
  );
}

interface KeywordStatsContentProps {
  keywordStats: KeywordStat[];
  handleClick: (keyword: string) => void;
  parentElement: HTMLDivElement | null;
  filterBy: string;
}

function KeywordStatsWithData({ keywordStats, handleClick, parentElement, filterBy }: KeywordStatsContentProps) {
  const filteredKeywordStats = useFilterStats(keywordStats, filterBy);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredKeywordStats.length || 0,
    getScrollElement: () => parentElement,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...filteredKeywordStats.map((x) => x.global_count)), [filteredKeywordStats]);

  return (
    <TabPanel
      value="keywords"
      style={{
        whiteSpace: "nowrap",
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
        padding: 0,
      }}
    >
      {filteredKeywordStats.length === 0 && <i>empty</i>}
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const keywordStat = filteredKeywordStats[virtualItem.index];
        return (
          <StatsDisplayButton
            key={virtualItem.key}
            term={keywordStat.keyword}
            count={keywordStat.filtered_count}
            totalCount={keywordStat.global_count}
            maxCount={maxValue}
            translateY={virtualItem.start}
            handleClick={() => handleClick(keywordStat.keyword)}
          />
        );
      })}
    </TabPanel>
  );
}
