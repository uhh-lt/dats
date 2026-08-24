import { useEffect, useRef } from "react";

interface UseInfiniteScrollSentinelProps {
  /** Whether more pages are available to fetch. */
  hasNextPage: boolean;
  /** Whether a fetch is currently in flight. */
  isFetching: boolean;
  /** Fetches the next page. */
  fetchNextPage: () => void;
  /** How far before the sentinel enters the viewport to trigger a fetch (e.g. "400px"). */
  rootMargin?: string;
}

/**
 * Attaches an IntersectionObserver to a sentinel element placed at the bottom of a scrollable
 * list. When the sentinel approaches the viewport and more data is available, the next page is
 * fetched automatically (infinite scroll). Returns a ref to attach to the sentinel element.
 */
export function useInfiniteScrollSentinel({
  hasNextPage,
  isFetching,
  fetchNextPage,
  rootMargin = "400px",
}: UseInfiniteScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetching) {
          fetchNextPage();
        }
      },
      { rootMargin },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, fetchNextPage, rootMargin]);

  return sentinelRef;
}
