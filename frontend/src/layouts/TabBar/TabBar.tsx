import AutorenewIcon from "@mui/icons-material/Autorenew";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Divider, IconButton, styled, Tab } from "@mui/material";
import React, { useEffect, useState } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "react-beautiful-dnd";
import { useLocation, useNavigate } from "react-router-dom";
import { getTabInfoFromPath } from "./tabInfo.tsx";

// Interface for tab data
interface TabData {
  id: string;
  path: string;
  label: string;
  icon?: React.ReactElement;
}

// Custom styled tab component for a Thunderbird-like appearance
const StyledTab = styled(Tab)(({ theme }) => ({
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

// Wrapper div for draggable tabs that also handles hover styling
const TabWrapper = styled("div")(({ theme }) => ({
  display: "flex",
  position: "relative",
  cursor: "grab",
  height: "auto",
  // Apply hover styling to the tab wrapper
  "&:hover": {
    "& .MuiTab-root::before": {
      backgroundColor: theme.palette.grey[600],
    },
    "& .MuiTab-root": {
      opacity: 1,
    },
  },
  // Style for active tab
  "&.active-tab": {
    "& .MuiTab-root": {
      opacity: 1,
      backgroundColor: theme.palette.background.default,
      "&::before": {
        backgroundColor: theme.palette.primary.main,
      },
    },
  },
  // Style for dragging tab
  "&.dragging": {
    boxShadow: "0 5px 10px rgba(0,0,0,0.2)",
    opacity: 0.9,
    cursor: "grabbing",
    zIndex: 10000,
  },
}));

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
        // Fix for tab placement during drag
        const dragStyle = {
          ...provided.draggableProps.style,
          // Constrain the height during dragging
          height: snapshot.isDragging ? "36px" : undefined,
        };

        return (
          <TabWrapper
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={dragStyle}
            onClick={onTabClick}
            className={`${snapshot.isDragging ? "dragging" : ""} ${isActive ? "active-tab" : ""}`}
          >
            <StyledTab
              label={
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    justifyContent: "space-between",
                    pointerEvents: "none",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {tab.icon}
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginLeft: "8px",
                      }}
                    >
                      {tab.label}
                    </span>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseClick();
                    }}
                    sx={{
                      ml: 1,
                      opacity: 0.5,
                      "&:hover": { opacity: 1 },
                      padding: "2px",
                      height: 18,
                      width: 18,
                      pointerEvents: "auto",
                    }}
                  >
                    <CloseIcon fontSize="small" sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              }
              value={index}
              sx={{
                pointerEvents: "none",
                width: "100%",
                boxSizing: "border-box",
                // Remove hover styles from here as they're now on the wrapper
                "&:hover": {},
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

  const handleTabClick = (index: number) => {
    if (tabs[index]) {
      navigate(tabs[index].path);
      setActiveTabIndex(index);
    }
  };

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
        height: 48, // Make tab bar slightly taller than tabs
      }}
    >
      <Divider orientation="vertical" />
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: "flex", flexGrow: 1, overflow: "auto" }}>
          <StrictModeDroppable
            droppableId="tabs"
            direction="horizontal"
            renderClone={(provided, snapshot, rubric) => {
              const tab = tabs[rubric.source.index];
              const isActiveTab = activeTabIndex === rubric.source.index;

              return (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  style={{
                    ...provided.draggableProps.style,
                    height: "36px",
                    display: "flex",
                    width: "auto",
                    minWidth: "100px",
                    boxShadow: "0 5px 10px rgba(0,0,0,0.2)",
                  }}
                  className={isActiveTab ? "active-clone" : ""}
                >
                  <StyledTab
                    label={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          {tab.icon}
                          <span style={{ marginLeft: "8px" }}>{tab.label}</span>
                        </Box>
                        <CloseIcon fontSize="small" sx={{ fontSize: 16, ml: 1, opacity: 0.5 }} />
                      </Box>
                    }
                    sx={{
                      width: "100%",
                      height: "36px",
                      boxSizing: "border-box",
                      padding: "8px 8px 10px 8px",
                    }}
                    className={isActiveTab ? "Mui-selected" : ""}
                  />
                </div>
              );
            }}
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
