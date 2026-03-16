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
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { Box } from "@mui/material";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { DragCloneRenderer } from "./_components/DragCloneRenderer";
import { DraggableTab } from "./_components/DraggableTab";
import { TabIconButton } from "./_components/styledComponents";
import { TabMenuButton } from "./_components/TabMenuButton";
import { useTabManagement } from "./_hooks/useTabManagement";
import { useTabScroll } from "./_hooks/useTabScroll";

interface TabBarProps {
  projectId: number;
}

export const TabBar = memo(({ projectId }: TabBarProps) => {
  // Container ref for scrolling
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [activeDragTabId, setActiveDragTabId] = useState<string | null>(null);

  // Use custom hooks
  const { tabs, activeTabIndex, handleTabClick, handleCloseTab, handleDragEnd } = useTabManagement(projectId);
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
  }, [tabs, activeDragTabId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragTabId(String(event.active.id));
  }, []);

  const handleDragEndEvent = useCallback(
    (event: DragEndEvent) => {
      const overId = event.over ? String(event.over.id) : null;
      handleDragEnd(String(event.active.id), overId);
      setActiveDragTabId(null);
    },
    [handleDragEnd],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragTabId(null);
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        borderBottom: "1px solid",
        borderColor: "primary.dark",
        bgcolor: (theme) => theme.palette.primary.main,
        height: 48.5,
        position: "relative",
      }}
    >
      <TabIconButton onClick={handleScrollLeft} disabled={!canScrollLeft} aria-label="scroll tabs left" size="small">
        <KeyboardArrowLeftIcon />
      </TabIconButton>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEndEvent}
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
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE and Edge
            }}
            className="hide-scrollbar" // Use existing class for Chrome, Safari, and Opera
            onScroll={updateScrollButtonVisibility}
          >
            {tabs.map((tab, index) => (
              <DraggableTab
                key={tab.id}
                tab={tab}
                index={index}
                isActive={activeTabIndex === index}
                onTabClick={() => handleTabClick(index)}
                onCloseClick={() => handleCloseTab(index)}
              />
            ))}
          </div>
        </Box>
        <DragOverlay>
          {activeDragTab ? (
            <DragCloneRenderer
              tab={activeDragTab}
              isActive={activeTabIndex !== null && tabs[activeTabIndex]?.id === activeDragTab.id}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TabIconButton onClick={handleScrollRight} disabled={!canScrollRight} aria-label="scroll tabs right" size="small">
        <KeyboardArrowRightIcon />
      </TabIconButton>
      <TabMenuButton projectId={projectId} activeTabIndex={activeTabIndex} totalTabs={tabs.length} />
    </Box>
  );
});
