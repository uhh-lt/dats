import { Icon } from "../../utils/IconUtils.tsx";

// Helper function to get tab info based on path
export const getTabInfoFromPath = (path: string): { label: string; icon: Icon } => {
  // Extract path segments
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) {
    return { label: "Home", icon: Icon.HOME };
  }

  // Handle project routes differently
  if (segments[0] === "project" && segments.length >= 2) {
    // Project-specific routes
    if (segments.length === 2) {
      return { label: `Project ${segments[1]}`, icon: Icon.DASHBOARD };
    }

    // Based on the third segment (after 'project' and projectId)
    switch (segments[2]) {
      case "search":
        return { label: "Search", icon: Icon.SEARCH };
      case "annotation":
        if (segments.length > 3) {
          return { label: `Document ${segments[3]}`, icon: Icon.ARTICLE };
        }
        return { label: "Annotation", icon: Icon.ANNOTATION };
      case "analysis":
        if (segments.length > 3) {
          const analysisType = segments[3];
          switch (analysisType) {
            case "frequency":
              return { label: "Code Frequency", icon: Icon.ANALYTICS };
            case "timeline":
              return { label: "Timeline Analysis", icon: Icon.ANALYTICS };
            case "span-annotations":
              return { label: "Span Annotations", icon: Icon.ANALYTICS };
            case "sentence-annotations":
              return { label: "Sentence Annotations", icon: Icon.ANALYTICS };
            case "word-frequency":
              return { label: "Word Frequency", icon: Icon.ANALYTICS };
            case "concepts-over-time-analysis":
              return { label: "Concepts Over Time", icon: Icon.ANALYTICS };
            case "annotation-scaling":
              return { label: "Annotation Scaling", icon: Icon.ANALYTICS };
            default:
              return { label: `Analysis: ${analysisType}`, icon: Icon.ANALYTICS };
          }
        }
        return { label: "Analysis", icon: Icon.ANALYTICS };
      case "whiteboard":
        if (segments.length > 3) {
          return { label: `Whiteboard ${segments[3]}`, icon: Icon.WHITEBOARD };
        }
        return { label: "Whiteboards", icon: Icon.WHITEBOARD };
      case "logbook":
        return { label: "Logbook", icon: Icon.LOGBOOK };
      case "tools":
        if (segments.length > 3) {
          const toolType = segments[3];
          switch (toolType) {
            case "duplicate-finder":
              return { label: "Duplicate Finder", icon: Icon.TUNE };
            case "document-sampler":
              return { label: "Document Sampler", icon: Icon.TUNE };
            case "ml-automation":
              return { label: "ML Automation", icon: Icon.TUNE };
            default:
              return { label: toolType.replace(/-/g, " "), icon: Icon.TUNE };
          }
        }
        return { label: "Tools", icon: Icon.TUNE };
      case "settings":
        return { label: "Project Settings", icon: Icon.SETTINGS };
      default:
        // For other project routes
        return {
          label: segments[2].charAt(0).toUpperCase() + segments[2].slice(1),
          icon: Icon.ARTICLE,
        };
    }
  }

  // Non-project routes
  switch (segments[0]) {
    case "dashboard":
      return { label: "Dashboard", icon: Icon.DASHBOARD };
    case "projects":
      return { label: "Projects", icon: Icon.LIST };
    case "me":
      return { label: "Profile", icon: Icon.ARTICLE };
    default:
      return {
        label: segments[0].charAt(0).toUpperCase() + segments[0].slice(1),
        icon: Icon.ARTICLE,
      };
  }
};
