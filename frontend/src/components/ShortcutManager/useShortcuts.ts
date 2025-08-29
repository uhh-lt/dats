import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TabActions } from "../../layouts/TabBar/tabSlice";
import { useAppDispatch } from "../../plugins/ReduxHooks";
import { CRUDDialogActions } from "../dialogSlice";

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
  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Memoize the sorted shortcuts
  const sortedShortcuts = useMemo(() => {
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
      createShortcut("goToSearch", "s", "Go to Search", () => navigate("search"), { ctrlmeta: true, shift: true }),
      createShortcut("goToPerspectives", "m", "Go to Perspectives", () => navigate("perspectives"), {
        ctrlmeta: true,
        shift: true,
      }),
      createShortcut("goToAnnotation", "a", "Go to Annotation", () => navigate("annotation"), {
        ctrlmeta: true,
        shift: true,
      }),
      createShortcut("goToAnalysis", "y", "Go to Analysis", () => navigate("analysis"), {
        ctrlmeta: true,
        shift: true,
      }),
      createShortcut("goToClassifier", "c", "Go to Classifier", () => navigate("classifier"), {
        ctrlmeta: true,
        shift: true,
      }),
      createShortcut("goToWhiteboard", "b", "Go to Whiteboard", () => navigate("whiteboard"), {
        ctrlmeta: true,
        shift: true,
      }),
      createShortcut("goToLogbook", "l", "Go to Logbook", () => navigate("logbook"), { ctrlmeta: true, shift: true }),
      createShortcut("goToHealth", "h", "Go to Health", () => navigate("health"), { ctrlmeta: true, shift: true }),
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
