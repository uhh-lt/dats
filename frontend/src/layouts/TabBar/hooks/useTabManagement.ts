import { useCallback, useEffect, useRef } from "react";
import { DropResult } from "react-beautiful-dnd";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { getTabInfoFromPath } from "../tabInfo";
import { TabActions } from "../tabSlice";
import { TabData } from "../types";

interface TabManagementHook {
  tabs: TabData[];
  activeTabIndex: number | null;
  handleTabClick: (index: number) => void;
  handleCloseTab: (index: number) => void;
  handleDragEnd: (result: DropResult) => void;
}

export const useTabManagement = (): TabManagementHook => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const tabs = useAppSelector((state) => state.tabs.tabs);
  const activeTabIndex = useAppSelector((state) => state.tabs.activeTabIndex);
  const lastPathRef = useRef(location.pathname);
  const navigationSourceRef = useRef<"tab_change" | "link_click" | null>(null);
  const isProcessingRef = useRef(false);

  // Handle location changes (link clicks)
  useEffect(() => {
    if (isProcessingRef.current) {
      return;
    }

    if (lastPathRef.current === location.pathname) {
      return;
    }

    // Mark that we're processing a navigation
    isProcessingRef.current = true;

    try {
      // Handle link navigation
      if (navigationSourceRef.current !== "tab_change") {
        const existingTabIndex = tabs.findIndex((tab) => tab.path === location.pathname);

        if (existingTabIndex !== -1) {
          dispatch(TabActions.setActiveTab(existingTabIndex));
        } else {
          // Create new tab for link navigation
          const { label, icon } = getTabInfoFromPath(location.pathname);
          const newTab: TabData = {
            id: `tab-${Date.now()}`,
            path: location.pathname,
            label,
            icon,
          };
          dispatch(TabActions.addTab(newTab));
        }
      }
    } finally {
      // Reset processing state and update lastPath
      lastPathRef.current = location.pathname;
      navigationSourceRef.current = null;
      isProcessingRef.current = false;
    }
  }, [location.pathname, tabs, dispatch]);

  // Handle active tab changes - intentionally not watching location.pathname
  useEffect(() => {
    if (isProcessingRef.current) {
      return;
    }

    if (activeTabIndex !== null && tabs[activeTabIndex]) {
      const targetPath = tabs[activeTabIndex].path;
      if (targetPath !== location.pathname) {
        navigationSourceRef.current = "tab_change";
        navigate(targetPath);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabIndex, tabs, navigate]); // Intentionally omitting location.pathname

  const handleTabClick = useCallback(
    (index: number) => {
      if (!isProcessingRef.current && tabs[index]) {
        navigationSourceRef.current = "tab_change";
        dispatch(TabActions.setActiveTab(index));
      }
    },
    [tabs, dispatch],
  );

  const handleCloseTab = useCallback(
    (index: number) => {
      dispatch(TabActions.removeTab(index));
    },
    [dispatch],
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const { source, destination } = result;
      if (source.index === destination.index) return;

      dispatch(
        TabActions.reorderTabs({
          sourceIndex: source.index,
          destinationIndex: destination.index,
        }),
      );
    },
    [dispatch],
  );

  return {
    tabs,
    activeTabIndex,
    handleTabClick,
    handleCloseTab,
    handleDragEnd,
  };
};
