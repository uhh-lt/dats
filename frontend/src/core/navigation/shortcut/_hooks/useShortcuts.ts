import { FEATURE_ENTRIES, FeatureEntry, useIsFeatureEnabled } from "@core/feature";
import { useOpenDialog, useToggleDialog } from "@store/global/dialogBusHooks";
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
  const isFeatureEnabled = useIsFeatureEnabled();

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
      ...FEATURE_ENTRIES.flatMap((entry: FeatureEntry): Shortcut[] => {
        // a disabled feature has no shortcut, so its keys do nothing
        if (!entry.shortcut || !isFeatureEnabled(entry.feature)) return [];
        return [
          createShortcut(
            `goTo-${entry.id}`,
            entry.shortcut,
            `Go to ${entry.title}`,
            () => tabNavigate({ to: entry.to, params: { projectId } }),
            {
              ctrlmeta: true,
              shift: true,
            },
          ),
        ];
      }),
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
  }, [tabNavigate, openProjectSettingsDialog, projectId, tabManager, toggleQuickCommandMenu, isFeatureEnabled]);

  return sortedShortcuts;
}
