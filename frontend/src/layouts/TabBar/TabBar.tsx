import AutorenewIcon from "@mui/icons-material/Autorenew";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Divider, IconButton, styled, Tab } from "@mui/material";
import React, { useEffect, useState } from "react";
import {
  DragDropContext,
  Draggable,
  DraggableProvided,
  DraggableRubric,
  DraggableStateSnapshot,
  Droppable,
  DropResult,
} from "react-beautiful-dnd";
import { useLocation, useNavigate } from "react-router-dom";
import { getTabInfoFromPath } from "./tabInfo.tsx";

// Interface for tab data
interface TabData {
  id: string;
  path: string;
  label: string;
  icon?: React.ReactElement;
}

// Styled components for tabs
const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: "42px",
  padding: "8px 8px 10px 8px",
  fontSize: theme.typography.body2.fontSize,
  borderRight: `1px solid ${theme.palette.divider}`,
  borderTop: `1px solid ${theme.palette.divider}`,
  opacity: 0.9,
  textTransform: "none",
  borderTopLeftRadius: "6px",
  borderTopRightRadius: "6px",
  position: "relative",
  overflow: "visible",
  backgroundColor: theme.palette.grey[100],
  "&::before": {
    content: '""',
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    height: "2px",
    backgroundColor: "transparent",
    transition: "background-color 0.2s",
  },
  "&.Mui-selected": {
    opacity: 1,
    backgroundColor: theme.palette.background.default,
    "&::before": {
      backgroundColor: theme.palette.primary.main,
    },
  },
  "& .MuiTab-wrapper": {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  "&:first-of-type": {
    borderLeft: `1px solid ${theme.palette.divider}`,
  },
}));

// Tab wrapper styling
const TabWrapper = styled("div")(({ theme }) => ({
  display: "flex",
  position: "relative",
  cursor: "grab",

  // Hover styling
  "&:hover": {
    "& .MuiTab-root::before": {
      backgroundColor: theme.palette.grey[600],
    },
    "& .MuiTab-root": {
      opacity: 1,
    },
  },
  // Active tab styling
  "&.active-tab": {
    "& .MuiTab-root": {
      opacity: 1,
      backgroundColor: theme.palette.background.default,
      "&::before": {
        backgroundColor: theme.palette.primary.main,
      },
    },
  },
  // Dragging tab styling
  "&.dragging": {
    boxShadow: "0 5px 10px rgba(0,0,0,0.2)",
    opacity: 0.9,
    cursor: "grabbing",
    zIndex: 10000,
  },
}));

// Close button styling
const CloseButton = styled(IconButton)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  opacity: 0.5,
  "&:hover": {
    opacity: 1,
  },
  padding: "2px",
  height: 18,
  width: 18,
  pointerEvents: "auto",
}));

// Container for the tab content
const TabContent = styled(Box)({
  display: "flex",
  alignItems: "center",
  width: "100%",
  justifyContent: "space-between",
  pointerEvents: "none",
});

// Container for the tab label and icon
const TabLabel = styled(Box)({
  display: "flex",
  alignItems: "center",
});

// Label text styling
const LabelText = styled("span")({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  marginLeft: "8px",
});

// Wrapper component for react-beautiful-dnd to work with React 18 StrictMode
const StrictModeDroppable = ({ children, ...props }: React.ComponentProps<typeof Droppable>) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props}>{children}</Droppable>;
};

// Tab wrapper with draggable functionality
const DraggableTab = ({
  tab,
  index,
  isActive,
  onTabClick,
  onCloseClick,
}: {
  tab: TabData;
  index: number;
  isActive: boolean;
  onTabClick: () => void;
  onCloseClick: () => void;
}) => {
  return (
    <Draggable key={tab.id} draggableId={tab.id} index={index} disableInteractiveElementBlocking>
      {(provided, snapshot) => {
        return (
          <TabWrapper
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={onTabClick}
            className={`${snapshot.isDragging ? "dragging" : ""} ${isActive ? "active-tab" : ""}`}
          >
            <StyledTab
              label={
                <TabContent>
                  <TabLabel>
                    {tab.icon}
                    <LabelText>{tab.label}</LabelText>
                  </TabLabel>
                  <CloseButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseClick();
                    }}
                  >
                    <CloseIcon fontSize="small" sx={{ fontSize: 16 }} />
                  </CloseButton>
                </TabContent>
              }
              value={index}
              sx={{
                pointerEvents: "none",
                width: "100%",
                boxSizing: "border-box",
                "&:hover": {}, // Remove hover styles from here as they're now on the wrapper
              }}
              onClick={undefined}
              className={isActive ? "Mui-selected" : ""}
            />
          </TabWrapper>
        );
      }}
    </Draggable>
  );
};

// Clone renderer for the dragged tab
const renderDragClone = (
  provided: DraggableProvided,
  _: DraggableStateSnapshot,
  rubric: DraggableRubric,
  tabs: TabData[],
  activeTabIndex: number | null,
) => {
  const tab = tabs[rubric.source.index];
  const isActiveTab = activeTabIndex === rubric.source.index;

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={{
        ...provided.draggableProps.style,
        display: "flex",
        width: "auto",
        minWidth: "100px",
        boxShadow: "0 5px 10px rgba(0,0,0,0.2)",
      }}
    >
      <StyledTab
        label={
          <TabContent>
            <TabLabel>
              {tab.icon}
              <LabelText>{tab.label}</LabelText>
            </TabLabel>
            <CloseIcon fontSize="small" sx={{ fontSize: 16, ml: 1, opacity: 0.5 }} />
          </TabContent>
        }
        sx={{
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 8px 10px 8px",
        }}
        className={isActiveTab ? "Mui-selected" : ""}
      />
    </div>
  );
};

// Main TabBar component
function TabBar() {
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

  return (
    <Box
      sx={{
        display: "flex",
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: (theme) => theme.palette.primary.main,
        height: 48,
      }}
    >
      <Divider orientation="vertical" />
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ height: 48, display: "flex", flexGrow: 1, overflow: "auto" }}>
          <StrictModeDroppable
            droppableId="tabs"
            direction="horizontal"
            renderClone={(provided, snapshot, rubric) =>
              renderDragClone(provided, snapshot, rubric, tabs, activeTabIndex)
            }
          >
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  display: "flex",
                  flexGrow: 1,
                  height: "100%",
                  alignItems: "flex-end",
                }}
              >
                {tabs.length === 0 && (
                  <StyledTab key={-1} label={"Loading"} value={0} icon={<AutorenewIcon fontSize="small" />} />
                )}

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
    </Box>
  );
}

export default TabBar;
