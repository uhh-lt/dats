import { getIconComponent, Icon } from "@components/icons";
import { Settings } from "@mui/icons-material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { useMemo } from "react";
import { useTabNavigate } from "../../tabs";
import { CommandItem } from "../_types/CommandItem";

export const useDefaultCommands = (projectId: number): CommandItem[] => {
  const openCodeCreate = useOpenDialog("codeCreate");
  const openTagCreate = useOpenDialog("tagCreate");
  const openDocumentUpload = useOpenDialog("documentUpload");
  const openProjectSettings = useOpenDialog("projectSettings");
  const tabNavigate = useTabNavigate();

  return useMemo(
    () => [
      // Create commands
      {
        id: "create-code",
        title: "Create Code",
        description: "Create a new code in the current project",
        category: "Create",
        icon: getIconComponent(Icon.CREATE),
        action: () => {
          openCodeCreate({});
        },
        keywords: ["new", "code", "create", "add"],
      },
      {
        id: "create-tag",
        title: "Create Tag",
        description: "Create a new tag in the current project",
        category: "Create",
        icon: getIconComponent(Icon.CREATE),
        action: () => {
          openTagCreate({});
        },
        keywords: ["new", "tag", "create", "add"],
      },
      {
        id: "upload-docs",
        title: "Upload Document(s)",
        description: "Upload new documents to the current project",
        category: "Create",
        icon: getIconComponent(Icon.CREATE),
        action: () => {
          openDocumentUpload();
        },
        keywords: ["new", "document", "create", "add", "upload"],
      },

      // Navigation commands
      {
        id: "document-search",
        title: "Document Search",
        description: "Search through documents",
        category: "Navigation",
        icon: getIconComponent(Icon.DOCUMENT_SEARCH),
        action: () => {
          tabNavigate({ to: "/project/$projectId/search", params: { projectId } });
        },
        keywords: ["find", "search", "documents", "navigate"],
      },
      {
        id: "image-search",
        title: "Image Search",
        description: "Search through images",
        category: "Navigation",
        icon: getIconComponent(Icon.IMAGE_SEARCH),
        action: () => {
          tabNavigate({ to: "/project/$projectId/imagesearch", params: { projectId } });
        },
        keywords: ["find", "search", "images", "navigate"],
      },
      {
        id: "sentence-search",
        title: "Sentence Search",
        description: "Search through sentences",
        category: "Navigation",
        icon: getIconComponent(Icon.SENTENCE_SEARCH),
        action: () => {
          tabNavigate({ to: "/project/$projectId/sentencesearch", params: { projectId } });
        },
        keywords: ["find", "search", "sentences", "navigate"],
      },
      {
        id: "perspectives",
        title: "Open Perspectives",
        description: "Go to project perspectives",
        category: "Navigation",
        icon: getIconComponent(Icon.PERSPECTIVES),
        action: () => {
          tabNavigate({ to: "/project/$projectId/perspectives", params: { projectId } });
        },
        keywords: ["perspectives", "map"],
      },
      {
        id: "classifier",
        title: "Open Classifiers",
        description: "Go to project classifiers",
        category: "Navigation",
        icon: getIconComponent(Icon.CLASSIFIER),
        action: () => {
          tabNavigate({ to: "/project/$projectId/classifier", params: { projectId } });
        },
        keywords: ["classifier", "document", "span", "sentence", "annotation", "training", "evaluation", "inference"],
      },
      {
        id: "annotation-view",
        title: "Annotation View",
        description: "Go to annotation view",
        category: "Navigation",
        icon: getIconComponent(Icon.ANNOTATION),
        action: () => {
          tabNavigate({ to: "/project/$projectId/annotation", params: { projectId } });
        },
        keywords: ["annotate", "annotation", "tag", "code"],
      },
      {
        id: "logbook",
        title: "Open Logbook",
        description: "Go to project logbook",
        category: "Navigation",
        icon: getIconComponent(Icon.LOGBOOK),
        action: () => {
          tabNavigate({ to: "/project/$projectId/logbook", params: { projectId } });
        },
        keywords: ["log", "notes", "journal", "memo"],
      },
      {
        id: "whiteboard",
        title: "Open Whiteboards",
        description: "Go to project whiteboards",
        category: "Navigation",
        icon: getIconComponent(Icon.WHITEBOARD),
        action: () => {
          tabNavigate({ to: "/project/$projectId/whiteboard", params: { projectId } });
        },
        keywords: ["whiteboard", "board", "visualization", "brainstorming"],
      },
      // Analysis commands
      {
        id: "analysis",
        title: "Analysis Dashboard",
        description: "Go to analysis dashboard",
        category: "Analysis",
        icon: getIconComponent(Icon.ANALYSIS),
        action: () => {
          tabNavigate({ to: "/project/$projectId/analysis", params: { projectId } });
        },
        keywords: ["go", "to", "navigate", "analysis", "dashboard"],
      },
      {
        id: "timeline-analysis",
        title: "Timeline Analysis",
        description: "Go to timeline analysis dashboard",
        category: "Analysis",
        icon: getIconComponent(Icon.TIMELINE_ANALYSIS),
        action: () => {
          tabNavigate({ to: "/project/$projectId/analysis/timeline", params: { projectId } });
        },
        keywords: ["go", "to", "navigate", "timeline", "analysis"],
      },
      {
        id: "concept-over-time-analysis",
        title: "Concept Over Time Analysis",
        description: "Go to concept over time analysis dashboard",
        category: "Analysis",
        icon: getIconComponent(Icon.COTA),
        action: () => {
          tabNavigate({ to: "/project/$projectId/analysis/concepts-over-time-analysis", params: { projectId } });
        },
        keywords: ["go", "to", "navigate", "concept", "over", "time", "analysis"],
      },
      {
        id: "word-frequency",
        title: "Word Frequency",
        description: "Go to word frequency analysis",
        category: "Analysis",
        icon: getIconComponent(Icon.WORD_FREQUENCY),
        action: () => {
          tabNavigate({ to: "/project/$projectId/analysis/word-frequency", params: { projectId } });
        },
        keywords: ["go", "to", "navigate", "word", "frequency", "analysis"],
      },
      {
        id: "code-frequency",
        title: "Code Frequency",
        description: "Go to code frequency analysis",
        category: "Analysis",
        icon: getIconComponent(Icon.CODE_FREQUENCY),
        action: () => {
          tabNavigate({ to: "/project/$projectId/analysis/code-frequency", params: { projectId } });
        },
        keywords: ["go", "to", "navigate", "code", "frequency", "analysis"],
      },
      {
        id: "span-annotation-table",
        title: "Span Annotation Table",
        description: "Go to span annotation table",
        category: "Analysis",
        icon: getIconComponent(Icon.SPAN_ANNOTATION_TABLE),
        action: () => {
          tabNavigate({ to: "/project/$projectId/analysis/span-annotations", params: { projectId } });
        },
        keywords: ["go", "to", "navigate", "span", "annotation", "table"],
      },
      {
        id: "sentence-annotation-table",
        title: "Sentence Annotation Table",
        description: "Go to sentence annotation table",
        category: "Analysis",
        icon: getIconComponent(Icon.SENTENCE_ANNOTATION_TABLE),
        action: () => {
          tabNavigate({ to: "/project/$projectId/analysis/sentence-annotations", params: { projectId } });
        },
        keywords: ["go", "to", "navigate", "sentence", "annotation", "table"],
      },
      {
        id: "bbox-annotation-table",
        title: "Image Annotation Table",
        description: "Go to image annotation table",
        category: "Analysis",
        icon: getIconComponent(Icon.BBOX_ANNOTATION_TABLE),
        action: () => {
          tabNavigate({ to: "/project/$projectId/analysis/bbox-annotations", params: { projectId } });
        },
        keywords: ["go", "to", "navigate", "image", "bbox", "box", "annotation", "table"],
      },
      // TOOLS
      {
        id: "ml-automation",
        title: "ML Automation",
        description: "Configure and run ML automation tasks",
        category: "Tools",
        icon: getIconComponent(Icon.ML_AUTOMATION),
        action: () => {
          tabNavigate({ to: "/project/$projectId/tools/ml-automation", params: { projectId } });
        },
        keywords: ["machine learning", "automation", "ai", "ml"],
      },
      {
        id: "duplicate-finder",
        title: "Duplicate Finder",
        description: "Go to duplicate finder",
        category: "Tools",
        icon: getIconComponent(Icon.DUPLICATE_FINDER),
        action: () => {
          tabNavigate({ to: "/project/$projectId/tools/duplicate-finder", params: { projectId } });
        },
        keywords: ["go", "to", "navigate", "duplicate", "finder"],
      },
      {
        id: "document-sampler",
        title: "Document Sampler",
        description: "Go to document sampler",
        category: "Tools",
        icon: getIconComponent(Icon.DOCUMENT_SAMPLER),
        action: () => {
          tabNavigate({ to: "/project/$projectId/tools/document-sampler", params: { projectId } });
        },
        keywords: ["go", "to", "navigate", "document", "sampler"],
      },
      {
        id: "health",
        title: "Document Health",
        description: "Go to document health",
        category: "Tools",
        icon: getIconComponent(Icon.HEALTH),
        action: () => {
          tabNavigate({ to: "/project/$projectId/tools/health", params: { projectId } });
        },
        keywords: ["health", "document", "status", "processing"],
      },
      // Settings commands
      {
        id: "project-settings",
        title: "Project Settings",
        description: "Open project settings",
        category: "Settings",
        icon: <Settings />,
        action: () => {
          openProjectSettings();
        },
        keywords: ["settings", "config", "configuration", "project"],
      },
    ],
    [openCodeCreate, openTagCreate, openDocumentUpload, openProjectSettings, tabNavigate, projectId],
  );
};
