import { InfiniteData } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";

interface TableData {
  total_results: number;
}

interface UseTableInfiniteScrollProps<T, U> {
  tableContainerRef: React.RefObject<HTMLDivElement>;
  data: InfiniteData<T> | undefined;
  isFetching: boolean;
  fetchNextPage: () => void;
  flatMapData: (page: T) => U[];
}

export const useTableInfiniteScroll = <T extends TableData, U>({
  tableContainerRef,
  data,
  isFetching,
  fetchNextPage,
  flatMapData,
}: UseTableInfiniteScrollProps<T, U>) => {
  // create a flat array of data mapped from id to row
  const flatData = useMemo(() => data?.pages.flatMap(flatMapData) ?? [], [flatMapData, data]);
  const totalResults = data?.pages?.[0]?.total_results ?? 0;
  const totalFetched = flatData.length;

  // infinite scrolling
  // called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnScroll = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        // once the user has scrolled within 400px of the bottom of the table, fetch more data if we can
        if (scrollHeight - scrollTop - clientHeight < 400 && !isFetching && totalFetched < totalResults) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalResults],
  );
  // a check on mount to see if the table is already scrolled to the bottom and immediately needs to fetch more data
  useEffect(() => {
    fetchMoreOnScroll(tableContainerRef.current);
  }, [tableContainerRef, fetchMoreOnScroll]);

  return { fetchMoreOnScroll, flatData, totalResults, totalFetched };
};
