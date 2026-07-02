import { useOpenDialog, useToggleDialog } from "@store/global/dialogBusSlice";
import { useAppSelector } from "@store/storeHooks";
import { useMemo } from "react";
import { useTabManager, useTabNavigate } from "../../tabs";

export interface Shortcut {
  id: string;
  keys: {
    key: string;
    ctrlmeta?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
  description: string;
  action: () => void;
}

// Utility function to create shortcuts more easily
export function createShortcut(
  id: string,
  key: string,
  description: string,
  action: () => void,
  modifiers: { ctrlmeta?: boolean; shift?: boolean; alt?: boolean } = {},
): Shortcut {
  return {
    id,
    keys: {
      key,
      ...modifiers,
    },
    description,
    action,
  };
}

export function useShortcuts() {
  const projectId = useAppSelector((state) => state.project.projectId);
  const tabNavigate = useTabNavigate();
  const tabManager = useTabManager(projectId || -1);
  const toggleQuickCommandMenu = useToggleDialog("quickCommandMenu");
  const openProjectSettingsDialog = useOpenDialog("projectSettings");

  // Memoize the sorted shortcuts
  const sortedShortcuts = useMemo(() => {
    if (!projectId) return [];

    const shortcuts: Shortcut[] = [
      // Existing quick command menu shortcut
      createShortcut("toggleQuickCommandMenu", "p", "Toggle Quick Command Menu", toggleQuickCommandMenu, {
        ctrlmeta: true,
        shift: true,
      }),

      // Navigation shortcuts
      createShortcut(
        "goToSearch",
        "s",
        "Go to Search",
        () => tabNavigate({ to: "/project/$projectId/search", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "goToPerspectives",
        "m",
        "Go to Perspectives",
        () => tabNavigate({ to: "/project/$projectId/perspectives", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "goToAnnotation",
        "a",
        "Go to Annotation",
        () => tabNavigate({ to: "/project/$projectId/annotation", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "goToAnalysis",
        "y",
        "Go to Analysis",
        () => tabNavigate({ to: "/project/$projectId/analysis", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "goToClassifier",
        "c",
        "Go to Classifier",
        () => tabNavigate({ to: "/project/$projectId/classifier", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "goToWhiteboard",
        "b",
        "Go to Whiteboard",
        () => tabNavigate({ to: "/project/$projectId/whiteboard", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "goToLogbook",
        "l",
        "Go to Logbook",
        () => tabNavigate({ to: "/project/$projectId/logbook", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "goToHealth",
        "h",
        "Go to Health",
        () => tabNavigate({ to: "/project/$projectId/tools/health", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut("goToSettings", ",", "Go to Settings", openProjectSettingsDialog, {
        ctrlmeta: true,
        shift: true,
      }),

      // Tab navigation shortcuts
      createShortcut("goToLeftTab", "ArrowLeft", "Go to Left Tab", () => tabManager.goToPreviousTab(), {
        ctrlmeta: true,
        shift: true,
      }),
      createShortcut("goToRightTab", "ArrowRight", "Go to Right Tab", () => tabManager.goToNextTab(), {
        ctrlmeta: true,
        shift: true,
      }),
      createShortcut("closeActiveTab", "w", "Close Active Tab", () => tabManager.closeActiveTab(), {
        ctrlmeta: true,
      }),

      // Documentation shortcuts
      createShortcut("openWiki", "w", "Open Wiki", () => window.open("https://github.com/uhh-lt/dats/wiki", "_blank"), {
        ctrlmeta: true,
        shift: true,
      }),
    ];

    return [...shortcuts].sort((a, b) => {
      const aModifiers = (a.keys.ctrlmeta ? 1 : 0) + (a.keys.shift ? 1 : 0) + (a.keys.alt ? 1 : 0);
      const bModifiers = (b.keys.ctrlmeta ? 1 : 0) + (b.keys.shift ? 1 : 0) + (b.keys.alt ? 1 : 0);
      return bModifiers - aModifiers; // Sort in descending order
    });
  }, [tabNavigate, openProjectSettingsDialog, projectId, tabManager, toggleQuickCommandMenu]);

  return sortedShortcuts;
}
