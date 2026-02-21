import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { TabActions } from "../../layouts/TabBar/tabSlice";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { CRUDDialogActions } from "../../store/dialogSlice";

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
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Memoize the sorted shortcuts
  const sortedShortcuts = useMemo(() => {
    if (!projectId) return [];

    const shortcuts: Shortcut[] = [
      // Existing quick command menu shortcut
      createShortcut(
        "toggleQuickCommandMenu",
        "p",
        "Toggle Quick Command Menu",
        () => dispatch(CRUDDialogActions.toggleQuickCommandMenu()),
        { ctrlmeta: true, shift: true },
      ),

      // Navigation shortcuts
      createShortcut(
        "goToSearch",
        "s",
        "Go to Search",
        () => navigate({ to: "/project/$projectId/search", params: { projectId } }),
        { ctrlmeta: true, shift: true },
      ),
      createShortcut(
        "goToPerspectives",
        "m",
        "Go to Perspectives",
        () => navigate({ to: "/project/$projectId/perspectives", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "goToAnnotation",
        "a",
        "Go to Annotation",
        () => navigate({ to: "/project/$projectId/annotation", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "goToAnalysis",
        "y",
        "Go to Analysis",
        () => navigate({ to: "/project/$projectId/analysis", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "goToClassifier",
        "c",
        "Go to Classifier",
        () => navigate({ to: "/project/$projectId/classifier", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "goToWhiteboard",
        "b",
        "Go to Whiteboard",
        () => navigate({ to: "/project/$projectId/whiteboard", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "goToLogbook",
        "l",
        "Go to Logbook",
        () => navigate({ to: "/project/$projectId/logbook", params: { projectId } }),
        { ctrlmeta: true, shift: true },
      ),
      createShortcut(
        "goToHealth",
        "h",
        "Go to Health",
        () => navigate({ to: "/project/$projectId/tools/health", params: { projectId } }),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut("goToSettings", ",", "Go to Settings", () => dispatch(CRUDDialogActions.openProjectSettings()), {
        ctrlmeta: true,
        shift: true,
      }),

      // Tab navigation shortcuts
      createShortcut(
        "goToLeftTab",
        "ArrowLeft",
        "Go to Left Tab",
        () => dispatch(TabActions.goToLeftTab({ projectId })),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "goToRightTab",
        "ArrowRight",
        "Go to Right Tab",
        () => dispatch(TabActions.goToRightTab({ projectId })),
        {
          ctrlmeta: true,
          shift: true,
        },
      ),
      createShortcut(
        "closeActiveTab",
        "w",
        "Close Active Tab",
        () => dispatch(TabActions.closeActiveTab({ projectId })),
        {
          ctrlmeta: true,
        },
      ),

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
  }, [dispatch, navigate, projectId]);

  return sortedShortcuts;
}
