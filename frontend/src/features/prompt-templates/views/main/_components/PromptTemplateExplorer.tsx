import { getIconComponent, Icon } from "@components/icons";
import { ITree, TreeExplorer } from "@components/tree-explorer";
import {
  LANGUAGE_LABELS,
  PromptTemplateExportButton,
  PromptTemplateHooks,
  TASK_TYPE_LABELS,
} from "@core/prompt-template";
import { PromptTemplateRead } from "@models/PromptTemplateRead";
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
import { useDuplicatePromptTemplate } from "../_hooks/useDuplicatePromptTemplate";
import { PromptTemplateCreateDialog } from "./PromptTemplateCreateDialog";

// a node of the explorer: the tasks are folders, the templates their files
interface PromptExplorerNode {
  id: number;
  name: string;
  parent_id?: number | null;
  template?: PromptTemplateRead;
}

const ROOT_ID = -1;
// the folder of a task gets a negative id, so it never collides with a template id
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
  template: PromptTemplateRead;
  onDuplicate: (template: PromptTemplateRead) => void;
}

/** The context menu of a template: duplicate it or (un)archive it. */
function PromptTemplateActionMenu({ template, onDuplicate }: ActionMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { mutate: updatePromptTemplateMutation } = PromptTemplateHooks.useUpdatePromptTemplate();

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
      onDuplicate(template);
    },
    [handleClose, onDuplicate, template],
  );
  const handleToggleArchived = useCallback(
    (event: MouseEvent) => {
      handleClose(event);
      updatePromptTemplateMutation({
        promptTemplateId: template.id,
        requestBody: { is_archived: !template.is_archived },
      });
    },
    [handleClose, updatePromptTemplateMutation, template.id, template.is_archived],
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
          <ListItemIcon>{getIconComponent(template.is_archived ? Icon.UNARCHIVE : Icon.ARCHIVE)}</ListItemIcon>
          <ListItemText>{template.is_archived ? "Unarchive" : "Archive"}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

const renderNode = (node: ITree<PromptExplorerNode>) => {
  const template = node.data.template;
  if (!template) {
    return (
      <Typography variant="body2" sx={{ fontWeight: "inherit", flexGrow: 1 }}>
        {node.data.name}
      </Typography>
    );
  }
  return (
    <Box sx={{ flexGrow: 1, minWidth: 0, opacity: template.is_archived ? 0.6 : 1 }}>
      <Typography variant="body2" noWrap>
        {template.name}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap component="div">
        {LANGUAGE_LABELS[template.language]}, version {template.versions.length}
        {template.is_archived ? ", archived" : ""}
      </Typography>
    </Box>
  );
};

interface PromptTemplateExplorerProps {
  projectId: number;
  templates: PromptTemplateRead[];
  selectedTemplateId: number | undefined;
  onSelect: (templateId: number) => void;
}

/** The project's prompt templates as files in one folder per task, searchable by name. */
export function PromptTemplateExplorer({
  projectId,
  templates,
  selectedTemplateId,
  onSelect,
  ...props
}: PromptTemplateExplorerProps & Omit<BoxProps, "onSelect">) {
  const [filter, setFilter] = useState("");
  const [expandedItems, setExpandedItems] = useState<string[]>(ALL_FOLDER_IDS);
  const [showArchived, setShowArchived] = useState(false);
  const handleToggleArchived = useCallback(() => setShowArchived((current) => !current), []);

  // root -> task folders (only those with templates) -> templates sorted by name
  const dataTree = useMemo<Node<ITree<PromptExplorerNode>>>(() => {
    const visible = templates.filter((template) => showArchived || !template.is_archived);
    const folders = Object.values(TaskType)
      .map((taskType) => ({
        data: { id: TASK_FOLDER_IDS[taskType], name: TASK_TYPE_LABELS[taskType], parent_id: ROOT_ID },
        children: visible
          .filter((template) => template.task_type === taskType)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((template) => ({
            data: { id: template.id, name: template.name, parent_id: TASK_FOLDER_IDS[taskType], template },
          })),
      }))
      .filter((folder) => folder.children.length > 0);
    return new Tree().parse<ITree<PromptExplorerNode>>({
      isRoot: true,
      data: { id: ROOT_ID, name: "Prompts", parent_id: undefined },
      children: folders,
    });
  }, [templates, showArchived]);

  const handleItemClick = useCallback(
    (_: SyntheticEvent, itemId: string) => {
      const id = Number(itemId);
      if (id > 0) onSelect(id);
    },
    [onSelect],
  );
  const handleDuplicated = useCallback((template: PromptTemplateRead) => onSelect(template.id), [onSelect]);
  const { duplicate } = useDuplicatePromptTemplate(projectId, handleDuplicated);
  const renderActions = useCallback(
    (node: ITree<PromptExplorerNode>) =>
      node.data.template ? <PromptTemplateActionMenu template={node.data.template} onDuplicate={duplicate} /> : null,
    [duplicate],
  );
  const handleCreated = useCallback((template: PromptTemplateRead) => onSelect(template.id), [onSelect]);

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
      selectedItems={selectedTemplateId}
      onItemClick={handleItemClick}
      // renderers
      renderNode={renderNode}
      renderActions={renderActions}
      // components
      listActions={
        <>
          <PromptTemplateCreateDialog projectId={projectId} onCreated={handleCreated} />
          <PromptTemplateExportButton />
          <ExplorerOptionsMenu showArchived={showArchived} onToggleShowArchived={handleToggleArchived} />
        </>
      }
    />
  );
}
