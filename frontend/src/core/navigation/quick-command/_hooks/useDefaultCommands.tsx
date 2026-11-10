import { getIconComponent, Icon } from "@components/icons";
import {
  FEATURE_ENTRIES,
  FeatureCommandCategory,
  FeatureEntry,
  FeatureEntryId,
  getFeatureCommandCategory,
  useIsFeatureEnabled,
} from "@core/feature";
import { Settings } from "@mui/icons-material";
import { useOpenDialog } from "@store/global/dialogBusHooks";
import { useMemo } from "react";
import { useTabNavigate } from "../../tabs";
import { CommandItem } from "../_types/CommandItem";

const CATEGORY_ORDER: FeatureCommandCategory[] = ["Navigation", "Analysis", "Tools"];

// The menu order within a category, which differs from the registry (sidebar) order.
const COMMAND_ORDER: FeatureEntryId[] = [
  "document-search",
  "image-search",
  "sentence-search",
  "perspectives",
  "classifier",
  "prompts",
  "experiments",
  "annotation",
  "memo-workspace",
  "whiteboard",
  "analysis",
  "timeline-analysis",
  "concept-over-time-analysis",
  "word-frequency",
  "code-frequency",
  "span-annotation-table",
  "sentence-annotation-table",
  "bbox-annotation-table",
];

function commandRank(entry: FeatureEntry): [number, number] {
  const position = COMMAND_ORDER.findIndex((id) => id === entry.id);
  return [CATEGORY_ORDER.indexOf(getFeatureCommandCategory(entry)), position < 0 ? COMMAND_ORDER.length : position];
}

const COMMAND_ENTRIES = FEATURE_ENTRIES.filter((entry: FeatureEntry) => entry.command !== undefined).sort((a, b) => {
  const [categoryA, positionA] = commandRank(a);
  const [categoryB, positionB] = commandRank(b);
  return categoryA - categoryB || positionA - positionB;
});

export const useDefaultCommands = (projectId: number): CommandItem[] => {
  const openCodeCreate = useOpenDialog("codeCreate");
  const openTagCreate = useOpenDialog("tagCreate");
  const openDocumentUpload = useOpenDialog("documentUpload");
  const openProjectSettings = useOpenDialog("projectSettings");
  const tabNavigate = useTabNavigate();
  const isFeatureEnabled = useIsFeatureEnabled();

  const featureCommands = useMemo(
    () =>
      COMMAND_ENTRIES.flatMap((entry: FeatureEntry): CommandItem[] => {
        if (!entry.command || !isFeatureEnabled(entry.feature)) return [];
        return [
          {
            id: entry.id,
            title: entry.command.title ?? entry.title,
            description: entry.command.description,
            category: getFeatureCommandCategory(entry),
            icon: getIconComponent(entry.icon),
            action: () => {
              tabNavigate({ to: entry.to, params: { projectId } });
            },
            keywords: [...entry.command.keywords],
          },
        ];
      }),
    [tabNavigate, projectId, isFeatureEnabled],
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

      ...featureCommands,
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
    [openCodeCreate, openTagCreate, openDocumentUpload, openProjectSettings, featureCommands],
  );
};
