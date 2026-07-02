import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { TabData } from "../../_types/TabData";
import { toTabNavigateArgs } from "../../_utils/TabRouteTargetUtils";
import { selectProjectTabState, TabActions } from "../../tabSlice";

type Direction = "left" | "right";

export function useTabManager(projectId: number) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const currentPathname = useRouterState({ select: (state) => state.location.pathname });

  const { tabsById, tabOrder } = useAppSelector(selectProjectTabState(projectId));

  const currentIndex = useMemo(() => tabOrder.indexOf(currentPathname), [tabOrder, currentPathname]);

  const navigateToTab = useCallback(
    (tab: TabData) => {
      navigate(toTabNavigateArgs(tab.route) as Parameters<typeof navigate>[0]);
    },
    [navigate],
  );

  const closeTab = useCallback(
    (tabIdToRemove: string) => {
      const isActiveTab = currentPathname === tabIdToRemove;

      if (isActiveTab) {
        const removeIndex = tabOrder.indexOf(tabIdToRemove);
        const leftCandidate = removeIndex > 0 ? tabOrder[removeIndex - 1] : null;
        const rightCandidate = removeIndex >= 0 && removeIndex < tabOrder.length - 1 ? tabOrder[removeIndex + 1] : null;
        const fallbackTabId = leftCandidate ?? rightCandidate;

        if (fallbackTabId && tabsById[fallbackTabId]) {
          navigateToTab(tabsById[fallbackTabId]);
        } else {
          navigate({ to: `/project/${projectId}/search` });
        }
      }

      dispatch(TabActions.removeTab({ projectId, tabId: tabIdToRemove }));
    },
    [currentPathname, dispatch, navigate, navigateToTab, projectId, tabOrder, tabsById],
  );

  const goToAdjacentTab = useCallback(
    (direction: Direction) => {
      if (tabOrder.length <= 1 || currentIndex === -1) {
        return;
      }

      const offset = direction === "left" ? -1 : 1;
      const nextIndex = (currentIndex + offset + tabOrder.length) % tabOrder.length;
      const nextTabId = tabOrder[nextIndex];
      const nextTab = tabsById[nextTabId];

      if (nextTab) {
        navigateToTab(nextTab);
      }
    },
    [currentIndex, navigateToTab, tabOrder, tabsById],
  );

  const closeActiveTab = useCallback(() => {
    if (currentIndex === -1) {
      return;
    }
    closeTab(tabOrder[currentIndex]);
  }, [closeTab, currentIndex, tabOrder]);

  const closeAllTabs = useCallback(() => {
    dispatch(TabActions.closeAllTabs({ projectId }));
    navigate({ to: `/project/${projectId}/search` });
  }, [dispatch, navigate, projectId]);

  const closeTabsToRight = useCallback(
    (fromTabId: string) => {
      const fromIndex = tabOrder.indexOf(fromTabId);
      if (fromIndex === -1 || fromIndex >= tabOrder.length - 1) {
        return;
      }

      const idsToClose = tabOrder.slice(fromIndex + 1);
      const activeWillClose = idsToClose.includes(currentPathname);

      if (activeWillClose && tabsById[fromTabId]) {
        navigateToTab(tabsById[fromTabId]);
      }

      dispatch(TabActions.closeTabsToRight({ projectId, fromTabId }));
    },
    [currentPathname, dispatch, navigateToTab, projectId, tabOrder, tabsById],
  );

  return {
    currentPathname,
    tabOrder,
    closeTab,
    closeActiveTab,
    closeAllTabs,
    closeTabsToRight,
    goToPreviousTab: () => goToAdjacentTab("left"),
    goToNextTab: () => goToAdjacentTab("right"),
  };
}
