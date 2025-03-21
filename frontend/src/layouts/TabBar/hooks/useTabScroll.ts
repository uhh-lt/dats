import { RefObject, useCallback, useEffect, useState } from "react";
import { TabData } from "../types/TabData";

interface TabScrollHook {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  updateScrollButtonVisibility: () => void;
  handleScrollLeft: () => void;
  handleScrollRight: () => void;
}

export const useTabScroll = (
  containerRef: RefObject<HTMLDivElement>,
  activeTabIndex: number | null,
  tabs: TabData[],
): TabScrollHook => {
  // Use state for scroll buttons visibility to properly trigger re-renders
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  // Calculate scroll states
  const getScrollInfo = useCallback(() => {
    if (!containerRef.current) {
      return { canScrollLeft: false, canScrollRight: false, scrollPosition: 0 };
    }

    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    return {
      canScrollLeft: scrollLeft > 0,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - 1, // -1 for rounding errors
      scrollPosition: scrollLeft,
    };
  }, [containerRef]);

  // Update scroll buttons visibility based on current scroll state
  // This is called from the onScroll event in the component
  const updateScrollButtonVisibility = useCallback(() => {
    const newScrollState = getScrollInfo();
    setScrollState({
      canScrollLeft: newScrollState.canScrollLeft,
      canScrollRight: newScrollState.canScrollRight,
    });
  }, [getScrollInfo]);

  // Scroll handler functions
  const handleScrollLeft = useCallback(() => {
    if (containerRef.current) {
      const { scrollPosition } = getScrollInfo();
      containerRef.current.scrollTo({
        left: Math.max(0, scrollPosition - 200),
        behavior: "smooth",
      });
    }
  }, [containerRef, getScrollInfo]);

  const handleScrollRight = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const { scrollPosition } = getScrollInfo();
      container.scrollTo({
        left: Math.min(container.scrollWidth - container.clientWidth, scrollPosition + 200),
        behavior: "smooth",
      });
    }
  }, [containerRef, getScrollInfo]);

  // Initialize scroll state
  useEffect(() => {
    updateScrollButtonVisibility();
    // Add resize observer to update scroll buttons when container size changes
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

  // Scroll active tab into view whenever activeTabIndex changes
  useEffect(() => {
    if (activeTabIndex === null || tabs.length === 0) return;

    const scrollActiveTabIntoView = () => {
      if (!containerRef.current) return;

      // Get all tab elements
      const tabElements = containerRef.current.querySelectorAll('[role="tab"]');
      if (tabElements.length > activeTabIndex) {
        const activeTabElement = tabElements[activeTabIndex];
        if (activeTabElement) {
          activeTabElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }

        // Update scroll buttons after scrolling
        setTimeout(updateScrollButtonVisibility, 300);
      }
    };

    // Small delay to ensure DOM is ready
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
