import { Settings } from "@mui/icons-material";
import { useMemo } from "react";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import { CommandItem } from "./CommandItem.ts";

export const useDefaultCommands = (projectId: number): CommandItem[] => {
  const dispatch = useAppDispatch();

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
          dispatch(CRUDDialogActions.openCodeCreateDialog({}));
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
          dispatch(CRUDDialogActions.openTagCreateDialog({}));
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
          dispatch(CRUDDialogActions.openDocumentUpload());
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
        route: `/project/${projectId}/search`,
        keywords: ["find", "search", "documents", "navigate"],
      },
      {
        id: "image-search",
        title: "Image Search",
        description: "Search through images",
        category: "Navigation",
        icon: getIconComponent(Icon.IMAGE_SEARCH),
        route: `/project/${projectId}/imagesearch`,
        keywords: ["find", "search", "images", "navigate"],
      },
      {
        id: "sentence-search",
        title: "Sentence Search",
        description: "Search through sentences",
        category: "Navigation",
        icon: getIconComponent(Icon.SENTENCE_SEARCH),
        route: `/project/${projectId}/sentencesearch`,
        keywords: ["find", "search", "sentences", "navigate"],
      },
      {
        id: "perspectives",
        title: "Open Perspectives",
        description: "Go to project perspectives",
        category: "Navigation",
        icon: getIconComponent(Icon.PERSPECTIVES),
        route: `/project/${projectId}/perspectives`,
        keywords: ["perspectives", "map"],
      },
      {
        id: "classifier",
        title: "Open Classifiers",
        description: "Go to project classifiers",
        category: "Navigation",
        icon: getIconComponent(Icon.CLASSIFIER),
        route: `/project/${projectId}/classifier`,
        keywords: ["classifier", "document", "span", "sentence", "annotation", "training", "evaluation", "inference"],
      },
      {
        id: "annotation-view",
        title: "Annotation View",
        description: "Go to annotation view",
        category: "Navigation",
        icon: getIconComponent(Icon.ANNOTATION),
        route: `/project/${projectId}/annotation`,
        keywords: ["annotate", "annotation", "tag", "code"],
      },
      {
        id: "logbook",
        title: "Open Logbook",
        description: "Go to project logbook",
        category: "Navigation",
        icon: getIconComponent(Icon.LOGBOOK),
        route: `/project/${projectId}/logbook`,
        keywords: ["log", "notes", "journal", "memo"],
      },
      {
        id: "whiteboard",
        title: "Open Whiteboards",
        description: "Go to project whiteboards",
        category: "Navigation",
        icon: getIconComponent(Icon.WHITEBOARD),
        route: `/project/${projectId}/whiteboard`,
        keywords: ["whiteboard", "board", "visualization", "brainstorming"],
      },
      // Analysis commands
      {
        id: "analysis",
        title: "Analysis Dashboard",
        description: "Go to analysis dashboard",
        category: "Analysis",
        icon: getIconComponent(Icon.ANALYSIS),
        route: `/project/${projectId}/analysis`,
        keywords: ["go", "to", "navigate", "analysis", "dashboard"],
      },
      {
        id: "timeline-analysis",
        title: "Timeline Analysis",
        description: "Go to timeline analysis dashboard",
        category: "Analysis",
        icon: getIconComponent(Icon.TIMELINE_ANALYSIS),
        route: `/project/${projectId}/analysis/timeline`,
        keywords: ["go", "to", "navigate", "timeline", "analysis"],
      },
      {
        id: "concept-over-time-analysis",
        title: "Concept Over Time Analysis",
        description: "Go to concept over time analysis dashboard",
        category: "Analysis",
        icon: getIconComponent(Icon.COTA),
        route: `/project/${projectId}/analysis/concepts-over-time-analysis`,
        keywords: ["go", "to", "navigate", "concept", "over", "time", "analysis"],
      },
      {
        id: "word-frequency",
        title: "Word Frequency",
        description: "Go to word frequency analysis",
        category: "Analysis",
        icon: getIconComponent(Icon.WORD_FREQUENCY),
        route: `/project/${projectId}/analysis/word-frequency`,
        keywords: ["go", "to", "navigate", "word", "frequency", "analysis"],
      },
      {
        id: "code-frequency",
        title: "Code Frequency",
        description: "Go to code frequency analysis",
        category: "Analysis",
        icon: getIconComponent(Icon.CODE_FREQUENCY),
        route: `/project/${projectId}/analysis/code-frequency`,
        keywords: ["go", "to", "navigate", "code", "frequency", "analysis"],
      },
      {
        id: "span-annotation-table",
        title: "Span Annotation Table",
        description: "Go to span annotation table",
        category: "Analysis",
        icon: getIconComponent(Icon.SPAN_ANNOTATION_TABLE),
        route: `/project/${projectId}/analysis/span-annotations`,
        keywords: ["go", "to", "navigate", "span", "annotation", "table"],
      },
      {
        id: "sentence-annotation-table",
        title: "Sentence Annotation Table",
        description: "Go to sentence annotation table",
        category: "Analysis",
        icon: getIconComponent(Icon.SENTENCE_ANNOTATION_TABLE),
        route: `/project/${projectId}/analysis/sentence-annotations`,
        keywords: ["go", "to", "navigate", "sentence", "annotation", "table"],
      },
      {
        id: "bbox-annotation-table",
        title: "Image Annotation Table",
        description: "Go to image annotation table",
        category: "Analysis",
        icon: getIconComponent(Icon.BBOX_ANNOTATION_TABLE),
        route: `/project/${projectId}/analysis/bbox-annotations`,
        keywords: ["go", "to", "navigate", "image", "bbox", "box", "annotation", "table"],
      },
      // TOOLS
      {
        id: "ml-automation",
        title: "ML Automation",
        description: "Configure and run ML automation tasks",
        category: "Tools",
        icon: getIconComponent(Icon.ML_AUTOMATION),
        route: `/project/${projectId}/tools/ml-automation`,
        keywords: ["machine learning", "automation", "ai", "ml"],
      },
      {
        id: "duplicate-finder",
        title: "Duplicate Finder",
        description: "Go to duplicate finder",
        category: "Tools",
        icon: getIconComponent(Icon.DUPLICATE_FINDER),
        route: `/project/${projectId}/tools/duplicate-finder`,
        keywords: ["go", "to", "navigate", "duplicate", "finder"],
      },
      {
        id: "document-sampler",
        title: "Document Sampler",
        description: "Go to document sampler",
        category: "Tools",
        icon: getIconComponent(Icon.DOCUMENT_SAMPLER),
        route: `/project/${projectId}/tools/document-sampler`,
        keywords: ["go", "to", "navigate", "document", "sampler"],
      },
      {
        id: "health",
        title: "Document Health",
        description: "Go to document health",
        category: "Tools",
        icon: getIconComponent(Icon.HEALTH),
        route: `/project/${projectId}/tools/health`,
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
          dispatch(CRUDDialogActions.openProjectSettings());
        },
        keywords: ["settings", "config", "configuration", "project"],
      },
    ],
    [dispatch, projectId],
  );
};
