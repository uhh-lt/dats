import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { Box } from "@mui/material";
import { memo, useRef } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import DragCloneRenderer from "./components/DragCloneRenderer.tsx";
import DraggableTab from "./components/DraggableTab.tsx";
import StrictModeDroppable from "./components/StrictModeDroppable.tsx";
import TabMenuButton from "./components/TabMenuButton.tsx";
import { useTabManagement } from "./hooks/useTabManagement";
import { useTabScroll } from "./hooks/useTabScroll";
import { TabIconButton } from "./styles/styledComponents.tsx";

interface TabBarProps {
  projectId: number;
}

function TabBar({ projectId }: TabBarProps) {
  // Container ref for scrolling
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Use custom hooks
  const { tabs, activeTabIndex, handleTabClick, handleCloseTab, handleDragEnd } = useTabManagement(projectId);
  const { canScrollLeft, canScrollRight, handleScrollLeft, handleScrollRight, updateScrollButtonVisibility } =
    useTabScroll(tabsContainerRef, activeTabIndex, tabs);

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

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box
          sx={{
            height: 48,
            display: "flex",
            flexGrow: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <StrictModeDroppable
            droppableId="tabs"
            direction="horizontal"
            renderClone={(provided, snapshot, rubric) => (
              <DragCloneRenderer
                provided={provided}
                snapshot={snapshot}
                rubric={rubric}
                tabs={tabs}
                activeTabIndex={activeTabIndex}
              />
            )}
          >
            {(provided) => (
              <div
                ref={(el) => {
                  provided.innerRef(el);
                  //@ts-expect-error Ignore TS error for now
                  tabsContainerRef.current = el;
                }}
                {...provided.droppableProps}
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
                {provided.placeholder}
              </div>
            )}
          </StrictModeDroppable>
        </Box>
      </DragDropContext>

      <TabIconButton onClick={handleScrollRight} disabled={!canScrollRight} aria-label="scroll tabs right" size="small">
        <KeyboardArrowRightIcon />
      </TabIconButton>
      <TabMenuButton projectId={projectId} activeTabIndex={activeTabIndex} totalTabs={tabs.length} />
    </Box>
  );
}

export default memo(TabBar);
