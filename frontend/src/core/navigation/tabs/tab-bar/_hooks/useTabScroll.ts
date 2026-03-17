import { RefObject, useCallback, useEffect, useState } from "react";
import { TabData } from "../../../_types/TabData";

interface TabScrollHook {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  updateScrollButtonVisibility: () => void;
  handleScrollLeft: () => void;
  handleScrollRight: () => void;
}

export const useTabScroll = (
  containerRef: RefObject<HTMLDivElement | null>,
  activeTabIndex: number,
  tabs: TabData[],
): TabScrollHook => {
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const getScrollInfo = useCallback(() => {
    if (!containerRef.current) {
      return { canScrollLeft: false, canScrollRight: false, scrollPosition: 0 };
    }

    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    return {
      canScrollLeft: scrollLeft > 0,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - 1,
      scrollPosition: scrollLeft,
    };
  }, [containerRef]);

  const updateScrollButtonVisibility = useCallback(() => {
    const next = getScrollInfo();
    setScrollState({
      canScrollLeft: next.canScrollLeft,
      canScrollRight: next.canScrollRight,
    });
  }, [getScrollInfo]);

  const handleScrollLeft = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollPosition } = getScrollInfo();
    containerRef.current.scrollTo({
      left: Math.max(0, scrollPosition - 200),
      behavior: "smooth",
    });
  }, [containerRef, getScrollInfo]);

  const handleScrollRight = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollPosition } = getScrollInfo();
    const container = containerRef.current;
    container.scrollTo({
      left: Math.min(container.scrollWidth - container.clientWidth, scrollPosition + 200),
      behavior: "smooth",
    });
  }, [containerRef, getScrollInfo]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      updateScrollButtonVisibility();
    });

    const containerElement = containerRef.current;
    if (containerElement) {
      resizeObserver.observe(containerElement);
    }

    return () => {
      if (containerElement) {
        resizeObserver.disconnect();
      }
    };
  }, [containerRef, updateScrollButtonVisibility]);

  useEffect(() => {
    if (activeTabIndex < 0 || tabs.length === 0 || !containerRef.current) {
      return;
    }

    const scrollActiveTabIntoView = () => {
      if (!containerRef.current) return;

      const tabElements = containerRef.current.querySelectorAll('[role="tab"]');
      if (tabElements.length <= activeTabIndex) return;

      const activeTabElement = tabElements[activeTabIndex];
      activeTabElement?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });

      setTimeout(updateScrollButtonVisibility, 300);
    };

    setTimeout(scrollActiveTabIntoView, 50);
  }, [activeTabIndex, containerRef, tabs, updateScrollButtonVisibility]);

  return {
    canScrollLeft: scrollState.canScrollLeft,
    canScrollRight: scrollState.canScrollRight,
    updateScrollButtonVisibility,
    handleScrollLeft,
    handleScrollRight,
  };
};
