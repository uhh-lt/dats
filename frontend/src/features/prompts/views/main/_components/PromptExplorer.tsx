import { getIconComponent, Icon } from "@components/icons";
import { ITree, TreeExplorer } from "@components/tree-explorer";
import { LANGUAGE_LABELS, PromptExportButton, PromptHooks, TASK_TYPE_LABELS } from "@core/prompt";
import { PromptRead } from "@models/PromptRead";
import { TaskType } from "@models/TaskType";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import {
  Box,
  BoxProps,
  Checkbox,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import { MouseEvent, SyntheticEvent, useCallback, useMemo, useState } from "react";
import Tree, { Node } from "ts-tree-structure";
import { useDuplicatePrompt } from "../_hooks/useDuplicatePrompt";
import { PromptCreateDialog } from "./PromptCreateDialog";

// a node of the explorer: the tasks are folders, the prompts their files
interface PromptExplorerNode {
  id: number;
  name: string;
  parent_id?: number | null;
  prompt?: PromptRead;
}

const ROOT_ID = -1;
// the folder of a task gets a negative id, so it never collides with a prompt id
const TASK_FOLDER_IDS: Record<TaskType, number> = {
  [TaskType.ANNOTATION]: -2,
  [TaskType.SENTENCE_ANNOTATION]: -3,
  [TaskType.TAGGING]: -4,
  [TaskType.METADATA_EXTRACTION]: -5,
};
const ALL_FOLDER_IDS = Object.values(TASK_FOLDER_IDS).map(String);

interface ExplorerOptionsMenuProps {
  showArchived: boolean;
  onToggleShowArchived: () => void;
}

/** The options of the explorer: show or hide archived prompts. */
function ExplorerOptionsMenu({ showArchived, onToggleShowArchived }: ExplorerOptionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleOpen = useCallback((event: MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget), []);
  const handleClose = useCallback(() => setAnchorEl(null), []);
  const handleToggleShowArchived = useCallback(() => {
    setAnchorEl(null);
    onToggleShowArchived();
  }, [onToggleShowArchived]);

  return (
    <>
      <Tooltip title="Explorer options">
        <IconButton onClick={handleOpen}>{getIconComponent(Icon.CONTEXT_MENU)}</IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={handleToggleShowArchived}>
          <ListItemIcon>
            <Checkbox edge="start" size="small" checked={showArchived} disableRipple sx={{ p: 0 }} />
          </ListItemIcon>
          <ListItemText>Show archived prompts</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

interface ActionMenuProps {
  prompt: PromptRead;
  onDuplicate: (prompt: PromptRead) => void;
}

/** The context menu of a prompt: duplicate it or (un)archive it. */
function PromptActionMenu({ prompt, onDuplicate }: ActionMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { mutate: updatePromptMutation } = PromptHooks.useUpdatePrompt();

  const handleOpen = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  }, []);
  const handleClose = useCallback((event?: { stopPropagation?: () => void }) => {
    event?.stopPropagation?.();
    setAnchorEl(null);
  }, []);
  const handleDuplicate = useCallback(
    (event: MouseEvent) => {
      handleClose(event);
      onDuplicate(prompt);
    },
    [handleClose, onDuplicate, prompt],
  );
  const handleToggleArchived = useCallback(
    (event: MouseEvent) => {
      handleClose(event);
      updatePromptMutation({
        promptId: prompt.id,
        requestBody: { is_archived: !prompt.is_archived },
      });
    },
    [handleClose, updatePromptMutation, prompt.id, prompt.is_archived],
  );

  return (
    <>
      <IconButton onClick={handleOpen}>{getIconComponent(Icon.CONTEXT_MENU)}</IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={handleDuplicate}>
          <ListItemIcon>{getIconComponent(Icon.DUPLICATE)}</ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleToggleArchived}>
          <ListItemIcon>{getIconComponent(prompt.is_archived ? Icon.UNARCHIVE : Icon.ARCHIVE)}</ListItemIcon>
          <ListItemText>{prompt.is_archived ? "Unarchive" : "Archive"}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

const renderNode = (node: ITree<PromptExplorerNode>) => {
  const prompt = node.data.prompt;
  if (!prompt) {
    return (
      <Typography variant="body2" sx={{ fontWeight: "inherit", flexGrow: 1 }}>
        {node.data.name}
      </Typography>
    );
  }
  return (
    <Box sx={{ flexGrow: 1, minWidth: 0, opacity: prompt.is_archived ? 0.6 : 1 }}>
      <Typography variant="body2" noWrap>
        {prompt.name}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap component="div">
        {LANGUAGE_LABELS[prompt.language]}, version {prompt.versions.length}
        {prompt.is_archived ? ", archived" : ""}
      </Typography>
    </Box>
  );
};

interface PromptExplorerProps {
  projectId: number;
  prompts: PromptRead[];
  selectedPromptId: number | undefined;
  onSelect: (promptId: number) => void;
}

/** The project's prompts as files in one folder per task, searchable by name. */
export function PromptExplorer({
  projectId,
  prompts,
  selectedPromptId,
  onSelect,
  ...props
}: PromptExplorerProps & Omit<BoxProps, "onSelect">) {
  const [filter, setFilter] = useState("");
  const [expandedItems, setExpandedItems] = useState<string[]>(ALL_FOLDER_IDS);
  const [showArchived, setShowArchived] = useState(false);
  const handleToggleArchived = useCallback(() => setShowArchived((current) => !current), []);

  // root -> task folders (only those with prompts) -> prompts sorted by name
  const dataTree = useMemo<Node<ITree<PromptExplorerNode>>>(() => {
    const visible = prompts.filter((prompt) => showArchived || !prompt.is_archived);
    const folders = Object.values(TaskType)
      .map((taskType) => ({
        data: { id: TASK_FOLDER_IDS[taskType], name: TASK_TYPE_LABELS[taskType], parent_id: ROOT_ID },
        children: visible
          .filter((prompt) => prompt.task_type === taskType)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((prompt) => ({
            data: { id: prompt.id, name: prompt.name, parent_id: TASK_FOLDER_IDS[taskType], prompt },
          })),
      }))
      .filter((folder) => folder.children.length > 0);
    return new Tree().parse<ITree<PromptExplorerNode>>({
      isRoot: true,
      data: { id: ROOT_ID, name: "Prompts", parent_id: undefined },
      children: folders,
    });
  }, [prompts, showArchived]);

  const handleItemClick = useCallback(
    (_: SyntheticEvent, itemId: string) => {
      const id = Number(itemId);
      if (id > 0) onSelect(id);
    },
    [onSelect],
  );
  const handleDuplicated = useCallback((prompt: PromptRead) => onSelect(prompt.id), [onSelect]);
  const { duplicate } = useDuplicatePrompt(projectId, handleDuplicated);
  const renderActions = useCallback(
    (node: ITree<PromptExplorerNode>) =>
      node.data.prompt ? <PromptActionMenu prompt={node.data.prompt} onDuplicate={duplicate} /> : null,
    [duplicate],
  );
  const handleCreated = useCallback((prompt: PromptRead) => onSelect(prompt.id), [onSelect]);

  return (
    <TreeExplorer
      {...props}
      dataIcon={TextSnippetIcon}
      // data
      dataTree={dataTree}
      // filter
      showFilter
      dataFilter={filter}
      onDataFilterChange={setFilter}
      // expansion
      expandedItems={expandedItems}
      onExpandedItemsChange={setExpandedItems}
      // selection
      selectedItems={selectedPromptId}
      onItemClick={handleItemClick}
      // renderers
      renderNode={renderNode}
      renderActions={renderActions}
      // components
      listActions={
        <>
          <PromptCreateDialog projectId={projectId} onCreated={handleCreated} />
          <PromptExportButton />
          <ExplorerOptionsMenu showArchived={showArchived} onToggleShowArchived={handleToggleArchived} />
        </>
      }
    />
  );
}
