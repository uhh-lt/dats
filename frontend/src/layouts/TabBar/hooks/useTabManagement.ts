import { useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";
import { DropResult } from "react-beautiful-dnd";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { getTabInfoFromPath } from "../tabInfo";
import { selectProjectTabs, TabActions } from "../tabSlice";
import { TabData } from "../types/TabData";

interface TabManagementHook {
  tabs: TabData[];
  activeTabIndex: number | null;
  handleTabClick: (index: number) => void;
  handleCloseTab: (index: number) => void;
  handleDragEnd: (result: DropResult) => void;
}

export const useTabManagement = (projectId: number): TabManagementHook => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { tabs, activeTabIndex } = useAppSelector(selectProjectTabs(projectId));
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
          dispatch(TabActions.setActiveTab({ tabId: existingTabIndex, projectId }));
        } else {
          // Create new tab for link navigation
          const tabData = getTabInfoFromPath(location.pathname);
          const newTab: TabData = {
            id: `tab-${Date.now()}`,
            ...tabData,
          };
          dispatch(TabActions.addTab({ tabData: newTab, projectId }));
        }
      }
    } finally {
      // Reset processing state and update lastPath
      lastPathRef.current = location.pathname;
      navigationSourceRef.current = null;
      isProcessingRef.current = false;
    }
  }, [location.pathname, tabs, dispatch, projectId]);

  // Handle active tab changes - intentionally not watching location.pathname
  useEffect(() => {
    if (isProcessingRef.current) {
      return;
    }

    if (activeTabIndex !== null && tabs[activeTabIndex]) {
      const targetPath = tabs[activeTabIndex].path;
      if (targetPath !== location.pathname) {
        navigationSourceRef.current = "tab_change";
        navigate({ to: targetPath });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabIndex, tabs, navigate]); // Intentionally omitting location.pathname

  const handleTabClick = useCallback(
    (index: number) => {
      if (!isProcessingRef.current && tabs[index]) {
        navigationSourceRef.current = "tab_change";
        dispatch(TabActions.setActiveTab({ tabId: index, projectId }));
      }
    },
    [tabs, dispatch, projectId],
  );

  const handleCloseTab = useCallback(
    (index: number) => {
      dispatch(TabActions.removeTab({ tabId: index, projectId }));
    },
    [dispatch, projectId],
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
          projectId,
        }),
      );
    },
    [dispatch, projectId],
  );

  return {
    tabs,
    activeTabIndex,
    handleTabClick,
    handleCloseTab,
    handleDragEnd,
  };
};
