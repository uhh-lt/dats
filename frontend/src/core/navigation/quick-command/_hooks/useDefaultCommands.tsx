import { getIconComponent, Icon } from "@components/icons";
import { Settings } from "@mui/icons-material";
import { useOpenDialog } from "@store/global/dialogBusHooks";
import { useMemo } from "react";
import { formatNavigationShortcut, getNavigationCommandCategory } from "../../navigationEntries";
import { NavigationCommandCategory, NavigationEntry, ResolvedNavigationEntry } from "../../navigationTypes";
import { useTabNavigate } from "../../tabs";
import { useEnabledNavigationEntries } from "../../useNavigationEntries";
import { CommandItem } from "../_types/CommandItem";

const CATEGORY_ORDER: NavigationCommandCategory[] = ["Navigation", "Analysis", "Tools"];

// Commands are grouped by category; within a category they keep the registry (sidebar and dashboard) order.
const byCategory = (a: NavigationEntry, b: NavigationEntry) =>
  CATEGORY_ORDER.indexOf(getNavigationCommandCategory(a)) - CATEGORY_ORDER.indexOf(getNavigationCommandCategory(b));

export const useDefaultCommands = (projectId: number): CommandItem[] => {
  const openCodeCreate = useOpenDialog("codeCreate");
  const openTagCreate = useOpenDialog("tagCreate");
  const openDocumentUpload = useOpenDialog("documentUpload");
  const openProjectSettings = useOpenDialog("projectSettings");
  const tabNavigate = useTabNavigate();
  const entries = useEnabledNavigationEntries();

  const navigationCommands = useMemo(
    () =>
      [...entries].sort(byCategory).map(
        (entry: ResolvedNavigationEntry): CommandItem => ({
          id: entry.id,
          title: entry.title,
          description: entry.command.description,
          category: getNavigationCommandCategory(entry),
          icon: getIconComponent(entry.icon),
          action: () => {
            tabNavigate({ to: entry.to, params: { projectId } });
          },
          keywords: [...entry.command.keywords],
          shortcut: formatNavigationShortcut(entry.shortcut),
        }),
      ),
    [tabNavigate, projectId, entries],
  );

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

      ...navigationCommands,
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
    [openCodeCreate, openTagCreate, openDocumentUpload, openProjectSettings, navigationCommands],
  );
};
