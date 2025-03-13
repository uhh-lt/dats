import { RefObject, useCallback, useEffect, useState } from "react";
import { TabData } from "../types";

interface TabScrollHook {
  tabsContainerRef: RefObject<HTMLDivElement>;
  scrollPosition: number;
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
  const [scrollPosition, setScrollPosition] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Update scroll buttons visibility based on scroll position
  const updateScrollButtonVisibility = useCallback(() => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
      setScrollPosition(scrollLeft);
    }
  }, [containerRef]);

  // Scroll handler functions
  const handleScrollLeft = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const targetScrollPosition = Math.max(0, scrollPosition - 200);
      container.scrollTo({
        left: targetScrollPosition,
        behavior: "smooth",
      });
    }
  }, [containerRef, scrollPosition]);

  const handleScrollRight = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const targetScrollPosition = Math.min(container.scrollWidth - container.clientWidth, scrollPosition + 200);
      container.scrollTo({
        left: targetScrollPosition,
        behavior: "smooth",
      });
    }
  }, [containerRef, scrollPosition]);

  // Attach scroll event listener to track scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", updateScrollButtonVisibility);
      // Initial check
      updateScrollButtonVisibility();
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", updateScrollButtonVisibility);
      }
    };
  }, [containerRef, updateScrollButtonVisibility]);

  // Check for scroll button visibility when tabs change
  useEffect(() => {
    if (tabs.length > 0) {
      updateScrollButtonVisibility();
    }
  }, [tabs, updateScrollButtonVisibility]);

  // Scroll active tab into view whenever activeTabIndex changes
  useEffect(() => {
    const scrollActiveTabIntoView = () => {
      if (activeTabIndex !== null && containerRef.current && tabs.length > 0) {
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
        }
      }
    };

    if (activeTabIndex !== null) {
      setTimeout(scrollActiveTabIntoView, 50);
    }
  }, [activeTabIndex, containerRef, tabs]);

  return {
    tabsContainerRef: containerRef,
    scrollPosition,
    canScrollLeft,
    canScrollRight,
    updateScrollButtonVisibility,
    handleScrollLeft,
    handleScrollRight,
  };
};
