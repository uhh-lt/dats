import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToFirstScrollableAncestor, restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { Box } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { selectProjectTabs, TabActions } from "../../tabSlice";
import { useTabManager } from "../hooks/useTabManager";
import { toTabNavigateArgs } from "../utils/TabRouteTargetUtils";
import { DragCloneRenderer } from "./_components/DragCloneRenderer";
import { DraggableTab } from "./_components/DraggableTab";
import { TabMenuButton } from "./_components/TabMenuButton";
import { TabIconButton } from "./_components/styledComponents";
import { useTabScroll } from "./_hooks/useTabScroll";

interface TabBarProps {
  projectId: number;
}

export const TabBar = memo(({ projectId }: TabBarProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const tabs = useAppSelector(selectProjectTabs(projectId));
  const tabManager = useTabManager(projectId);

  const activeTabIndex = useMemo(() => {
    return tabs.findIndex((tab) => tab.id === location.pathname);
  }, [tabs, location.pathname]);
  const sortableTabIds = useMemo(() => tabs.map((tab) => tab.id), [tabs]);

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [activeDragTabId, setActiveDragTabId] = useState<string | null>(null);

  const { canScrollLeft, canScrollRight, handleScrollLeft, handleScrollRight, updateScrollButtonVisibility } =
    useTabScroll(tabsContainerRef, activeTabIndex, tabs);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const activeDragTab = useMemo(() => {
    if (!activeDragTabId) {
      return null;
    }
    return tabs.find((tab) => tab.id === activeDragTabId) ?? null;
  }, [activeDragTabId, tabs]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragTabId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const overId = event.over ? String(event.over.id) : null;
      const activeId = String(event.active.id);

      if (overId && activeId !== overId) {
        dispatch(
          TabActions.reorderTabs({
            projectId,
            sourceTabId: activeId,
            destinationTabId: overId,
          }),
        );
      }

      setActiveDragTabId(null);
    },
    [dispatch, projectId],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragTabId(null);
  }, []);

  if (!tabs.length) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        borderBottom: "1px solid",
        borderColor: "primary.dark",
        bgcolor: (theme) => theme.palette.primary.main,
        height: 49,
        position: "relative",
      }}
    >
      <TabIconButton onClick={handleScrollLeft} disabled={!canScrollLeft} aria-label="scroll tabs left" size="small">
        <KeyboardArrowLeftIcon />
      </TabIconButton>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis, restrictToFirstScrollableAncestor]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <Box
          sx={{
            height: 48,
            display: "flex",
            flexGrow: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            ref={tabsContainerRef}
            style={{
              display: "flex",
              flexGrow: 1,
              height: "100%",
              alignItems: "flex-end",
              overflowX: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
            className="hide-scrollbar"
            onScroll={updateScrollButtonVisibility}
          >
            <SortableContext items={sortableTabIds} strategy={horizontalListSortingStrategy}>
              {tabs.map((tab, index) => (
                <DraggableTab
                  key={tab.id}
                  tab={tab}
                  index={index}
                  isActive={tab.id === location.pathname}
                  onTabClick={() => {
                    navigate(toTabNavigateArgs(tab.route) as Parameters<typeof navigate>[0]);
                  }}
                  onCloseClick={() => tabManager.closeTab(tab.id)}
                />
              ))}
            </SortableContext>
          </div>
        </Box>
        <DragOverlay>
          {activeDragTab ? (
            <DragCloneRenderer tab={activeDragTab} isActive={activeDragTab.id === location.pathname} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TabIconButton onClick={handleScrollRight} disabled={!canScrollRight} aria-label="scroll tabs right" size="small">
        <KeyboardArrowRightIcon />
      </TabIconButton>
      <TabMenuButton
        projectId={projectId}
        activeTabId={activeTabIndex >= 0 ? tabs[activeTabIndex].id : null}
        totalTabs={tabs.length}
      />
    </Box>
  );
});
