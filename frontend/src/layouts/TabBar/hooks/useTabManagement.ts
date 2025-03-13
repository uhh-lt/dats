import { useEffect, useState } from "react";
import { DropResult } from "react-beautiful-dnd";
import { useLocation, useNavigate } from "react-router-dom";
import { getTabInfoFromPath } from "../tabInfo";
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
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState<number | null>(null);

  // Track navigation and update tabs
  useEffect(() => {
    const currentPath = location.pathname;

    setTabs((prevTabs) => {
      const existingTabIndex = prevTabs.findIndex((tab) => tab.path === currentPath);

      if (existingTabIndex === -1) {
        // Create a new tab for this path
        const { label, icon } = getTabInfoFromPath(currentPath);

        const newTab: TabData = {
          id: `tab-${Date.now()}`, // unique ID for each tab
          path: currentPath,
          label,
          icon,
        };

        return [...prevTabs, newTab];
      }
      return prevTabs;
    });

    // Update active tab index based on current path
    const existingTabIndex = tabs.findIndex((tab) => tab.path === currentPath);
    if (existingTabIndex !== -1) {
      // Tab already exists, just make it active
      setActiveTabIndex(existingTabIndex);
    } else {
      setActiveTabIndex(tabs.length > 0 ? tabs.length : 0); // Set the new tab as active
    }
  }, [location.pathname, tabs]);

  // Handle tab click - navigate to corresponding page
  const handleTabClick = (index: number) => {
    if (tabs[index]) {
      navigate(tabs[index].path);
      setActiveTabIndex(index);
    }
  };

  // Handle tab close
  const handleCloseTab = (index: number) => {
    // Don't close if it's the last tab
    if (tabs.length <= 1) return;

    const newTabs = [...tabs];
    newTabs.splice(index, 1);
    setTabs(newTabs);

    // If we closed the active tab, navigate to the previous tab
    if (activeTabIndex === index) {
      const newIndex = index > 0 ? index - 1 : 0;
      navigate(newTabs[newIndex].path);
      setActiveTabIndex(newIndex);
    }
    // If we closed a tab before the active one, adjust the active index
    else if (activeTabIndex !== null && index < activeTabIndex) {
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  // Handle drag end for tab reordering
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return; // Dropped outside the list
    }

    const { source, destination } = result;

    if (source.index === destination.index) {
      return; // No change in position
    }

    // Reorder tabs
    const newTabs = [...tabs];
    const [movedTab] = newTabs.splice(source.index, 1);
    newTabs.splice(destination.index, 0, movedTab);

    setTabs(newTabs);

    // Update active tab index if it was moved
    if (activeTabIndex === source.index) {
      setActiveTabIndex(destination.index);
    }
    // Handle case where active tab index needs adjustment due to reordering
    else if (activeTabIndex !== null) {
      if (source.index < activeTabIndex && destination.index >= activeTabIndex) {
        setActiveTabIndex(activeTabIndex - 1);
      } else if (source.index > activeTabIndex && destination.index <= activeTabIndex) {
        setActiveTabIndex(activeTabIndex + 1);
      }
    }
  };

  return {
    tabs,
    activeTabIndex,
    handleTabClick,
    handleCloseTab,
    handleDragEnd,
  };
};
