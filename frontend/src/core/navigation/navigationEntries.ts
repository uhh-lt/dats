import { NavigationCommandCategory, NavigationEntry, NavigationGroup, NavigationShortcut } from "./navigationTypes";

/**
 * Every user-facing navigation entry (page) of a project, in sidebar and analysis dashboard order.
 * The sidebar, the analysis dashboard, the quick command menu, the navigation shortcuts and the tab titles are
 * generated from it (through `useNavigationEntries`). The feature of a page is declared on its route
 * (`staticData.feature`), never here.
 */
export const NAVIGATION_ENTRIES = [
  // Search (sidebar search menu)
  {
    id: "document-search",
    group: "search",
    title: "Document Search",
    to: "/project/$projectId/search",
    shortcut: "s",
    command: {
      description: "Search through documents",
      keywords: ["find", "search", "documents", "navigate"],
    },
  },
  {
    id: "image-search",
    group: "search",
    to: "/project/$projectId/imagesearch",
    shortcut: { after: "s", key: "i" },
    command: {
      description: "Search through images",
      keywords: ["find", "search", "images", "navigate"],
    },
  },
  {
    id: "sentence-search",
    group: "search",
    to: "/project/$projectId/sentencesearch",
    shortcut: { after: "s", key: "s" },
    command: {
      description: "Search through sentences",
      keywords: ["find", "search", "sentences", "navigate"],
    },
  },

  // Main (sidebar)
  {
    id: "perspectives",
    group: "main",
    title: "Perspectives",
    to: "/project/$projectId/perspectives",
    shortcut: "e",
    command: {
      description: "Go to project perspectives",
      keywords: ["perspectives", "map"],
    },
  },
  {
    id: "annotation",
    group: "main",
    title: "Annotation",
    to: "/project/$projectId/annotation",
    shortcut: "a",
    command: {
      description: "Go to annotation view",
      keywords: ["annotate", "annotation", "tag", "code"],
    },
  },
  {
    id: "analysis",
    group: "main",
    title: "Analysis",
    to: "/project/$projectId/analysis",
    shortcut: "y",
    command: {
      description: "Go to analysis dashboard",
      keywords: ["go", "to", "navigate", "analysis", "dashboard"],
      category: "Analysis",
    },
  },
  {
    id: "classifier",
    group: "main",
    title: "Classifier",
    to: "/project/$projectId/classifier",
    shortcut: "c",
    command: {
      description: "Go to project classifiers",
      keywords: ["classifier", "document", "span", "sentence", "annotation", "training", "evaluation", "inference"],
    },
  },
  {
    id: "prompts",
    group: "main",
    title: "Prompts",
    to: "/project/$projectId/prompts",
    shortcut: { after: "c", key: "p" },
    command: {
      description: "Go to the prompts of the project",
      keywords: ["prompt", "template", "llm", "assistant", "placeholder", "few-shot", "examples"],
    },
  },
  {
    id: "experiments",
    group: "main",
    title: "Experiments",
    to: "/project/$projectId/experiments",
    shortcut: { after: "c", key: "x" },
    command: {
      description: "Go to the experiments of the project: compare prompt versions and models",
      keywords: ["experiment", "run", "prompt", "model", "llm", "evaluation", "gold", "f1"],
    },
  },
  {
    id: "whiteboard",
    group: "main",
    title: "Whiteboard",
    to: "/project/$projectId/whiteboard",
    shortcut: "b",
    command: {
      description: "Go to project whiteboards",
      keywords: ["whiteboard", "board", "visualization", "brainstorming"],
    },
  },
  {
    id: "memo-workspace",
    group: "main",
    title: "Memo Workspace",
    to: "/project/$projectId/memo-workspace",
    shortcut: "m",
    command: {
      description: "Go to project memo workspace",
      keywords: ["log", "notes", "journal", "memo", "logbook"],
    },
  },

  // Analysis (analysis dashboard)
  {
    id: "code-frequency",
    group: "analysis",
    title: "Code Frequency Analysis",
    description: "Analyse the frequencies and occurrences of all codes in this project.",
    to: "/project/$projectId/analysis/code-frequency",
    shortcut: { after: "y", key: "c" },
    command: {
      description: "Go to code frequency analysis",
      keywords: ["go", "to", "navigate", "code", "frequency", "analysis"],
    },
  },
  {
    id: "agreement",
    group: "analysis",
    title: "Annotator Agreement",
    description: "Compare two annotators: scores, confusion matrix and disagreements.",
    to: "/project/$projectId/analysis/agreement",
    shortcut: { after: "y", key: "a" },
    command: {
      description: "Go to annotator agreement analysis",
      keywords: ["go", "to", "navigate", "agreement", "annotator", "inter-annotator", "kappa", "compare"],
    },
  },
  {
    id: "timeline-analysis",
    group: "analysis",
    title: "Timeline Analysis",
    description: "Analyse the occurrence of concepts over time.",
    to: "/project/$projectId/analysis/timeline",
    shortcut: { after: "y", key: "t" },
    command: {
      description: "Go to timeline analysis dashboard",
      keywords: ["go", "to", "navigate", "timeline", "analysis"],
    },
  },
  {
    id: "span-annotation-table",
    group: "analysis",
    title: "Span Annotation Table",
    description: "View, search, edit span annotations in a table.",
    to: "/project/$projectId/analysis/span-annotations",
    shortcut: { after: "y", key: "s" },
    command: {
      description: "Go to span annotation table",
      keywords: ["go", "to", "navigate", "span", "annotation", "table"],
    },
  },
  {
    id: "sentence-annotation-table",
    group: "analysis",
    title: "Sentence Annotation Table",
    description: "View, search, edit sentence annotations in a table.",
    to: "/project/$projectId/analysis/sentence-annotations",
    shortcut: { after: "y", key: "e" },
    command: {
      description: "Go to sentence annotation table",
      keywords: ["go", "to", "navigate", "sentence", "annotation", "table"],
    },
  },
  {
    id: "bbox-annotation-table",
    group: "analysis",
    title: "Bounding-Box Annotation Table",
    description: "View, search, edit bbox annotations in a table.",
    to: "/project/$projectId/analysis/bbox-annotations",
    shortcut: { after: "y", key: "b" },
    command: {
      description: "Go to bounding-box annotation table",
      keywords: ["go", "to", "navigate", "image", "bbox", "box", "annotation", "table"],
    },
  },
  {
    id: "word-frequency",
    group: "analysis",
    to: "/project/$projectId/analysis/word-frequency",
    shortcut: { after: "y", key: "w" },
    command: {
      description: "Go to word frequency analysis",
      keywords: ["go", "to", "navigate", "word", "frequency", "analysis"],
    },
  },
  {
    id: "concept-over-time-analysis",
    group: "analysis",
    to: "/project/$projectId/analysis/concepts-over-time-analysis",
    shortcut: { after: "y", key: "o" },
    command: {
      description: "Go to concepts over time analysis",
      keywords: ["go", "to", "navigate", "concept", "over", "time", "analysis"],
    },
  },
  {
    id: "annotation-scaling",
    group: "analysis",
    to: "/project/$projectId/analysis/annotation-scaling",
    shortcut: { after: "y", key: "l" },
    command: {
      description: "Go to annotation scaling",
      keywords: ["go", "to", "navigate", "annotation", "scaling", "suggest", "similar", "sentences"],
    },
  },
  {
    id: "tag-recommendations",
    group: "analysis",
    to: "/project/$projectId/analysis/tag-recommendations",
    shortcut: { after: "y", key: "r" },
    command: {
      description: "Go to tag recommendations",
      keywords: ["go", "to", "navigate", "tag", "recommendation", "suggest", "documents"],
    },
  },

  // Tools (sidebar tools menu)
  {
    id: "ml-automation",
    group: "tools",
    title: "ML Automation",
    to: "/project/$projectId/tools/ml-automation",
    shortcut: { after: "h", key: "m" },
    command: {
      description: "Configure and run ML automation tasks",
      keywords: ["machine learning", "automation", "ai", "ml"],
    },
  },
  {
    id: "duplicate-finder",
    group: "tools",
    to: "/project/$projectId/tools/duplicate-finder",
    shortcut: { after: "h", key: "d" },
    command: {
      description: "Go to duplicate finder",
      keywords: ["go", "to", "navigate", "duplicate", "finder"],
    },
  },
  {
    id: "document-sampler",
    group: "tools",
    title: "Document Sampler",
    to: "/project/$projectId/tools/document-sampler",
    shortcut: { after: "h", key: "s" },
    command: {
      description: "Go to document sampler",
      keywords: ["go", "to", "navigate", "document", "sampler"],
    },
  },
  {
    id: "health",
    group: "tools",
    title: "Document Health",
    to: "/project/$projectId/tools/health",
    shortcut: "h",
    command: {
      description: "Go to document health",
      keywords: ["health", "document", "status", "processing"],
    },
  },
] as const satisfies readonly NavigationEntry[];

const GROUP_COMMAND_CATEGORY: Record<NavigationGroup, NavigationCommandCategory> = {
  search: "Navigation",
  main: "Navigation",
  analysis: "Analysis",
  tools: "Tools",
};

export function getNavigationCommandCategory(entry: NavigationEntry): NavigationCommandCategory {
  return entry.command.category ?? GROUP_COMMAND_CATEGORY[entry.group];
}

/** The shortcut hint shown in labels and tooltips, e.g. "⌘⇧S" or "⌘⇧Y W". */
export function formatNavigationShortcut(shortcut: NavigationShortcut): string {
  if (typeof shortcut === "string") return `⌘⇧${shortcut.toUpperCase()}`;
  return `⌘⇧${shortcut.after.toUpperCase()} ${shortcut.key.toUpperCase()}`;
}
