import AnalyticsIcon from "@mui/icons-material/Analytics";
import ArticleIcon from "@mui/icons-material/Article";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EditIcon from "@mui/icons-material/Edit";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import HomeIcon from "@mui/icons-material/Home";
import LayersIcon from "@mui/icons-material/Layers";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";

// Helper function to get tab info based on path
export const getTabInfoFromPath = (path: string): { label: string; icon: React.ReactElement } => {
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
