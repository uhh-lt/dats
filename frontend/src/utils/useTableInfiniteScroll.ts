import { InfiniteData } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";

interface TableData {
  total_results: number;
}

interface UseTransformInfiniteDataProps<T, U> {
  data: InfiniteData<T> | undefined;
  flatMapData: (page: T) => U[];
  lengthData?: (data: U[]) => number;
}

export const useTransformInfiniteData = <T extends TableData, U>({
  data,
  flatMapData,
  lengthData = (data) => data.length,
}: UseTransformInfiniteDataProps<T, U>) => {
  // create a flat array of data mapped from id to row
  const flatData = useMemo(() => data?.pages.flatMap(flatMapData) ?? [], [flatMapData, data]);
  const totalResults = data?.pages?.[0]?.total_results ?? 0;
  const totalFetched = lengthData(flatData);

  return { flatData, totalResults, totalFetched };
};

interface UseTableFetchMoreOnScrollProps {
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
  isFetching: boolean;
  fetchNextPage: () => void;
  totalFetched: number;
  totalResults: number;
}

export const useTableFetchMoreOnScroll = ({
  tableContainerRef,
  isFetching,
  fetchNextPage,
  totalFetched,
  totalResults,
}: UseTableFetchMoreOnScrollProps) => {
  // infinite scrolling
  // called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnScroll = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        // once the user has scrolled within 400px of the bottom of the table, fetch more data if we can
        if (scrollHeight - scrollTop - clientHeight < 400 && !isFetching && totalFetched < totalResults) {
          console.log("Fetching more data on scroll");
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

  return fetchMoreOnScroll;
};

interface UseTableInfiniteScrollProps<T, U> {
  tableContainerRef: React.RefObject<HTMLDivElement>;
  data: InfiniteData<T> | undefined;
  isFetching: boolean;
  fetchNextPage: () => void;
  flatMapData: (page: T) => U[];
  lengthData?: (data: U[]) => number;
}

export const useTableInfiniteScroll = <T extends TableData, U>({
  tableContainerRef,
  data,
  isFetching,
  fetchNextPage,
  flatMapData,
  lengthData = (data) => data.length,
}: UseTableInfiniteScrollProps<T, U>) => {
  const { flatData, totalResults, totalFetched } = useTransformInfiniteData({ data, flatMapData, lengthData });
  const fetchMoreOnScroll = useTableFetchMoreOnScroll({
    tableContainerRef,
    isFetching,
    fetchNextPage,
    totalFetched,
    totalResults,
  });
  return { fetchMoreOnScroll, flatData, totalResults, totalFetched };
};
