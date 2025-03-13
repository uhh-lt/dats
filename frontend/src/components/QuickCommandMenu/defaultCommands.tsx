import {
  Add,
  AssignmentTurnedIn,
  AutoAwesome,
  BarChart,
  Brush,
  ImageSearch,
  LocalOffer,
  Search,
  Settings,
} from "@mui/icons-material";
import { CommandItem } from "./CommandItem";

export const generateDefaultCommands = (projectId: string | undefined): CommandItem[] => {
  if (!projectId) return [];

  return [
    // Create commands
    {
      id: "create-code",
      title: "Create Code",
      description: "Create a new code in the current project",
      category: "Create",
      icon: <Add />,
      action: () => {
        window.dispatchEvent(new CustomEvent("open-code-create-dialog"));
      },
      keywords: ["new", "code", "create", "add"],
    },
    {
      id: "create-tag",
      title: "Create Tag",
      description: "Create a new tag in the current project",
      category: "Create",
      icon: <LocalOffer />,
      action: () => {
        window.dispatchEvent(new CustomEvent("open-tag-create-dialog"));
      },
      keywords: ["new", "tag", "create", "add"],
    },

    // Navigation commands
    {
      id: "document-search",
      title: "Document Search",
      description: "Search through documents",
      category: "Navigation",
      icon: <Search />,
      route: `/project/${projectId}/search`,
      keywords: ["find", "search", "documents", "navigate"],
    },
    {
      id: "image-search",
      title: "Image Search",
      description: "Search through images",
      category: "Navigation",
      icon: <ImageSearch />,
      route: `/project/${projectId}/imagesearch`,
      keywords: ["find", "search", "images", "navigate", "visual"],
    },
    {
      id: "annotation-view",
      title: "Annotation View",
      description: "Go to annotation view",
      category: "Navigation",
      icon: <Brush />,
      route: `/project/${projectId}/annotation`,
      keywords: ["annotate", "annotation", "tag", "code"],
    },
    {
      id: "logbook",
      title: "Open Logbook",
      description: "Go to project logbook",
      category: "Navigation",
      icon: <AssignmentTurnedIn />,
      route: `/project/${projectId}/logbook`,
      keywords: ["log", "notes", "journal", "memo"],
    },

    // Analysis commands
    {
      id: "analysis",
      title: "Analysis Dashboard",
      description: "View project analysis dashboard",
      category: "Analysis",
      icon: <BarChart />,
      route: `/project/${projectId}/analysis`,
      keywords: ["analyze", "statistics", "dashboard", "charts"],
    },
    {
      id: "ml-automation",
      title: "ML Automation",
      description: "Configure and run ML automation tasks",
      category: "Analysis",
      icon: <AutoAwesome />,
      route: `/project/${projectId}/tools/ml-automation`,
      keywords: ["machine learning", "automation", "ai", "ml"],
    },

    // Settings commands
    {
      id: "project-settings",
      title: "Project Settings",
      description: "Open project settings",
      category: "Settings",
      icon: <Settings />,
      action: () => {
        window.dispatchEvent(new CustomEvent("open-project-settings-dialog"));
      },
      keywords: ["settings", "config", "configuration", "project"],
    },
  ];
};
