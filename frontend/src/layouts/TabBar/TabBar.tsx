import AnalyticsIcon from "@mui/icons-material/Analytics";
import ArticleIcon from "@mui/icons-material/Article";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EditIcon from "@mui/icons-material/Edit";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import HomeIcon from "@mui/icons-material/Home";
import LayersIcon from "@mui/icons-material/Layers";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";
import { Box, Divider, IconButton, Tab, Tabs, styled } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
  "&:hover": {
    opacity: 1,
    "&::before": {
      backgroundColor: theme.palette.grey[600],
    },
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

// Custom tab component with icon and close button
function CustomTab(props: {
  label: string;
  icon?: React.ReactElement;
  onClose: (event: React.MouseEvent) => void;
  [key: string]: unknown;
}) {
  const { label, onClose, icon, ...other } = props;

  const handleClose = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onClose) onClose(event);
  };

  return (
    <StyledTab
      {...other}
      label={
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {icon}
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginLeft: "8px",
              }}
            >
              {label}
            </span>
          </Box>
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{
              ml: 1,
              opacity: 0.5,
              "&:hover": { opacity: 1 },
              padding: "2px",
              height: 18,
              width: 18,
            }}
          >
            <CloseIcon fontSize="small" sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      }
    />
  );
}

// Helper function to get tab info based on path
const getTabInfoFromPath = (path: string): { label: string; icon: React.ReactElement } => {
  // Extract path segments
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) {
    return { label: "Home", icon: <HomeIcon fontSize="small" /> };
  }

  // Handle project routes differently
  if (segments[0] === "project" && segments.length >= 2) {
    // Project-specific routes
    if (segments.length === 2) {
      return { label: `Project ${segments[1]}`, icon: <DashboardIcon fontSize="small" /> };
    }

    // Based on the third segment (after 'project' and projectId)
    switch (segments[2]) {
      case "search":
        return { label: "Search", icon: <SearchIcon fontSize="small" /> };
      case "annotation":
        if (segments.length > 3) {
          return { label: `Document ${segments[3]}`, icon: <ArticleIcon fontSize="small" /> };
        }
        return { label: "Annotation", icon: <EditIcon fontSize="small" /> };
      case "analysis":
        if (segments.length > 3) {
          const analysisType = segments[3];
          switch (analysisType) {
            case "frequency":
              return { label: "Code Frequency", icon: <AnalyticsIcon fontSize="small" /> };
            case "timeline":
              return { label: "Timeline Analysis", icon: <AnalyticsIcon fontSize="small" /> };
            case "span-annotations":
              return { label: "Span Annotations", icon: <AnalyticsIcon fontSize="small" /> };
            case "sentence-annotations":
              return { label: "Sentence Annotations", icon: <AnalyticsIcon fontSize="small" /> };
            case "word-frequency":
              return { label: "Word Frequency", icon: <AnalyticsIcon fontSize="small" /> };
            case "concepts-over-time-analysis":
              return { label: "Concepts Over Time", icon: <AnalyticsIcon fontSize="small" /> };
            case "annotation-scaling":
              return { label: "Annotation Scaling", icon: <AnalyticsIcon fontSize="small" /> };
            default:
              return { label: `Analysis: ${analysisType}`, icon: <AnalyticsIcon fontSize="small" /> };
          }
        }
        return { label: "Analysis", icon: <AnalyticsIcon fontSize="small" /> };
      case "whiteboard":
        if (segments.length > 3) {
          return { label: `Whiteboard ${segments[3]}`, icon: <LayersIcon fontSize="small" /> };
        }
        return { label: "Whiteboards", icon: <LayersIcon fontSize="small" /> };
      case "logbook":
        return { label: "Logbook", icon: <MenuBookIcon fontSize="small" /> };
      case "tools":
        if (segments.length > 3) {
          const toolType = segments[3];
          switch (toolType) {
            case "duplicate-finder":
              return { label: "Duplicate Finder", icon: <TuneIcon fontSize="small" /> };
            case "document-sampler":
              return { label: "Document Sampler", icon: <TuneIcon fontSize="small" /> };
            case "ml-automation":
              return { label: "ML Automation", icon: <TuneIcon fontSize="small" /> };
            default:
              return { label: toolType.replace(/-/g, " "), icon: <TuneIcon fontSize="small" /> };
          }
        }
        return { label: "Tools", icon: <TuneIcon fontSize="small" /> };
      case "settings":
        return { label: "Project Settings", icon: <SettingsIcon fontSize="small" /> };
      default:
        // For other project routes
        return {
          label: segments[2].charAt(0).toUpperCase() + segments[2].slice(1),
          icon: <ArticleIcon fontSize="small" />,
        };
    }
  }

  // Non-project routes
  switch (segments[0]) {
    case "dashboard":
      return { label: "Dashboard", icon: <DashboardIcon fontSize="small" /> };
    case "projects":
      return { label: "Projects", icon: <FormatListBulletedIcon fontSize="small" /> };
    case "me":
      return { label: "Profile", icon: <ArticleIcon fontSize="small" /> };
    default:
      return {
        label: segments[0].charAt(0).toUpperCase() + segments[0].slice(1),
        icon: <ArticleIcon fontSize="small" />,
      };
  }
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

    const existingTabIndex = tabs.findIndex((tab) => tab.path === currentPath);
    if (existingTabIndex !== -1) {
      // Tab already exists, just make it active
      setActiveTabIndex(existingTabIndex);
      console.log("Tab already exists, just make it active");
    } else {
      setActiveTabIndex(tabs.length - 1 >= 0 ? tabs.length - 1 : 0); // Set the new tab as active
    }
  }, [location.pathname, tabs]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    // Navigate to the path associated with the selected tab
    if (tabs[newValue]) {
      navigate(tabs[newValue].path);
      setActiveTabIndex(newValue);
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
      <Tabs
        value={activeTabIndex !== null ? activeTabIndex : 0}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons
        aria-label="document tabs"
        slotProps={{
          scrollButtons: {
            sx: {
              color: "white",
              minWidth: 48,
            },
          },
          indicator: {
            style: {
              display: "none", // Hide the default indicator
            },
          },
        }}
        sx={{
          flexGrow: 1,
          "& .MuiTab-root": {
            marginTop: 0.5,
          },
        }}
      >
        {tabs.length === 0 && (
          <CustomTab
            key={-1}
            label={"Loading"}
            icon={<AutorenewIcon fontSize="small" />}
            onClose={() => handleCloseTab(0)}
            id={`tab-0`}
          />
        )}
        {tabs.map((tab, index) => (
          <CustomTab
            key={tab.id}
            label={tab.label}
            icon={tab.icon}
            onClose={() => handleCloseTab(index)}
            id={`tab-${tab.id}`}
          />
        ))}
      </Tabs>
    </Box>
  );
}

export default TabBar;
