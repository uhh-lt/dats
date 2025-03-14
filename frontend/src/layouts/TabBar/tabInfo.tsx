import { Icon } from "../../utils/icons/iconUtils.tsx";

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
      return { label: `Project ${segments[1]}`, icon: Icon.PROJECT };
    }

    // Based on the third segment (after 'project' and projectId)
    switch (segments[2]) {
      case "search":
        return { label: "Search", icon: Icon.SEARCH };
      case "annotation":
        if (segments.length > 3) {
          return { label: `Document ${segments[3]}`, icon: Icon.DOCUMENT };
        }
        return { label: "Annotation", icon: Icon.ANNOTATION };
      case "analysis":
        if (segments.length > 3) {
          const analysisType = segments[3];
          switch (analysisType) {
            case "frequency":
              return { label: "Code Frequency", icon: Icon.CODE_FREQUENCY };
            case "timeline":
              return { label: "Timeline Analysis", icon: Icon.TIMELINE_ANALYSIS };
            case "span-annotations":
              return { label: "Span Annotations", icon: Icon.SPAN_ANNOTATION_TABLE };
            case "sentence-annotations":
              return { label: "Sentence Annotations", icon: Icon.SENTENCE_ANNOTATION_TABLE };
            case "word-frequency":
              return { label: "Word Frequency", icon: Icon.WORD_FREQUENCY };
            case "concepts-over-time-analysis":
              return { label: "Concepts Over Time", icon: Icon.COTA };
            case "annotation-scaling":
              return { label: "Annotation Scaling", icon: Icon.ANNOTATION_SCALING };
            default:
              return { label: `Analysis: ${analysisType}`, icon: Icon.TIMELINE_ANALYSIS };
          }
        }
        return { label: "Analysis", icon: Icon.ANALYSIS };
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
              return { label: "Duplicate Finder", icon: Icon.DUPLICATE_FINDER };
            case "document-sampler":
              return { label: "Document Sampler", icon: Icon.DOCUMENT_SAMPLER };
            case "ml-automation":
              return { label: "ML Automation", icon: Icon.ML_AUTOMATION };
            default:
              return { label: toolType.replace(/-/g, " "), icon: Icon.TOOLS };
          }
        }
        return { label: "Tools", icon: Icon.TOOLS };
      case "settings":
        return { label: "Project Settings", icon: Icon.SETTINGS };
      default:
        // For other project routes
        return {
          label: segments[2].charAt(0).toUpperCase() + segments[2].slice(1),
          icon: Icon.PROJECT,
        };
    }
  }

  // Non-project routes
  switch (segments[0]) {
    case "projects":
      return { label: "Projects", icon: Icon.PROJECT };
    case "me":
      return { label: "Profile", icon: Icon.USER };
    default:
      return {
        label: segments[0].charAt(0).toUpperCase() + segments[0].slice(1),
        icon: Icon.PROJECT,
      };
  }
};
