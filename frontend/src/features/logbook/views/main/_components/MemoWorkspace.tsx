import { MemoHooks } from "@api/hooks/MemoHooks";
import { MemoViewHooks } from "@api/hooks/MemoViewHooks";
import { SidebarContentLayout } from "@components/content-layouts";
import { DATSToolbar } from "@components/DATSToolbar";
import { EmojiGlyph } from "@components/emoji";
import { getIconComponent, Icon } from "@components/icons";
import {
  ColumnInfo,
  countFilterExpressions,
  createEmptyFilter,
  FilterDialog,
  MyFilter,
  MyFilterExpression,
} from "@core/filter";
import { MemoEditorPane, useMemoSearchInfo } from "@core/memo";
import { useOpenConfirmationDialog } from "@core/notification";
import { UserRenderer } from "@core/user";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToFirstScrollableAncestor, restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { AttachedObjectTypeOperator } from "@models/AttachedObjectTypeOperator";
import { BooleanOperator } from "@models/BooleanOperator";
import { DateGranularity } from "@models/DateGranularity";
import { GroupConfig_MemoColumns_ } from "@models/GroupConfig_MemoColumns_";
import { GroupSummary } from "@models/GroupSummary";
import { IDOperator } from "@models/IDOperator";
import { LogicalOperator } from "@models/LogicalOperator";
import { MemoColumns } from "@models/MemoColumns";
import { MemoRow } from "@models/MemoRow";
import { MemoSearchViewRead } from "@models/MemoSearchViewRead";
import { MemoSearchViewUpdate } from "@models/MemoSearchViewUpdate";
import { SearchEntityType } from "@models/SearchEntityType";
import { SearchViewLayout } from "@models/SearchViewLayout";
import { Sort_MemoColumns_ } from "@models/Sort_MemoColumns_";
import { SortDirection } from "@models/SortDirection";
import { StringOperator } from "@models/StringOperator";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CategoryIcon from "@mui/icons-material/Category";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteIcon from "@mui/icons-material/Delete";
import DynamicFeedIcon from "@mui/icons-material/DynamicFeed";
import EditIcon from "@mui/icons-material/Edit";
import GridViewIcon from "@mui/icons-material/GridView";
import LinkIcon from "@mui/icons-material/Link";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import SubjectIcon from "@mui/icons-material/Subject";
import TableRowsIcon from "@mui/icons-material/TableRows";
import TitleIcon from "@mui/icons-material/Title";
import UpdateIcon from "@mui/icons-material/Update";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import ViewListIcon from "@mui/icons-material/ViewList";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogbookActions } from "../../../store/logbookSlice";

const PAGE_SIZE = 50;

const defaultFilterExpression: MyFilterExpression<MemoColumns> = {
  id: "memo-filter-expression",
  column: MemoColumns.M_TITLE,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};
const emptyFilter = (): MyFilter<MemoColumns> => ({ ...createEmptyFilter(crypto.randomUUID()), items: [] });
const expressionFilter = (
  column: MemoColumns,
  operator: StringOperator | BooleanOperator | AttachedObjectTypeOperator,
  value: string | boolean,
): MyFilter<MemoColumns> => ({
  id: crypto.randomUUID(),
  logic_operator: LogicalOperator.AND,
  items: [{ id: crypto.randomUUID(), column, operator, value }],
});
const formatDate = (value: string) => new Date(value).toLocaleString();

interface MemoWorkspaceProps {
  projectId: number;
  userId: number;
  selectedMemoId?: number;
  onSelectMemo: (memoId?: number) => void;
}

export function MemoWorkspace({ projectId, userId, selectedMemoId, onSelectMemo }: MemoWorkspaceProps) {
  const scope = `${userId}:${projectId}`;
  const dispatch = useAppDispatch();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const preferences = useAppSelector((state) => state.logbook.workspaces[scope]);
  const viewsQuery = MemoViewHooks.useGetViews(projectId);
  const createView = MemoViewHooks.useCreateView();
  const updateView = MemoViewHooks.useUpdateView();
  const { mutate: reorderViewOrder } = MemoViewHooks.useReorderViews(projectId);
  const deleteView = MemoViewHooks.useDeleteView();
  const createMemo = MemoHooks.useCreateMemo();
  const selectedMemo = MemoHooks.useGetMemo(selectedMemoId);
  const { data: columnInfo } = useMemoSearchInfo(projectId);
  const [searchQuery, setSearchQuery] = useState("");
  const [expertMode, setExpertMode] = useState(false);
  const [viewMenuAnchor, setViewMenuAnchor] = useState<HTMLElement | null>(null);
  const [createMenuAnchor, setCreateMenuAnchor] = useState<HTMLElement | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [activeViewId, setActiveViewId] = useState<number>();
  const updateTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingUpdate = useRef<MemoSearchViewUpdate>({});
  const updateQueue = useRef(Promise.resolve());
  const views = useMemo(
    () => [...(viewsQuery.data ?? [])].sort((left, right) => left.position - right.position || left.id - right.id),
    [viewsQuery.data],
  );
  const activeView = views.find((view) => view.id === activeViewId);
  const normalizedRenameValue = renameValue.trim();
  const renameError =
    normalizedRenameValue.length === 0
      ? "View name is required."
      : views.some(
            (view) =>
              view.id !== activeView?.id && view.name.toLocaleLowerCase() === normalizedRenameValue.toLocaleLowerCase(),
          )
        ? "A view with this name already exists."
        : undefined;

  // Adjust the active view during rendering when the current selection is invalid
  // (views not loaded yet, or the active view was deleted). See https://react.dev/learn/you-might-not-need-an-effect
  if (activeViewId === undefined || !views.some((view) => view.id === activeViewId)) {
    const fallbackViewId = (views.find((view) => view.id === preferences?.lastViewId) ?? views[0])?.id;
    if (fallbackViewId !== activeViewId) {
      setActiveViewId(fallbackViewId);
    }
  }
  useEffect(() => {
    if (!selectedMemo.data) return;
    dispatch(
      LogbookActions.rememberMemo({
        scope,
        memo: {
          id: selectedMemo.data.id,
          title: selectedMemo.data.title,
          icon: selectedMemo.data.icon,
          updated: selectedMemo.data.updated,
        },
      }),
    );
  }, [dispatch, scope, selectedMemo.data]);

  const handleSelectView = useCallback(
    (viewId: number) => {
      setActiveViewId(viewId);
      dispatch(LogbookActions.rememberView({ scope, viewId }));
      setSearchQuery("");
    },
    [dispatch, scope],
  );
  const handleReorderViews = useCallback(
    (viewIds: number[]) => {
      reorderViewOrder({ projectId, entityType: SearchEntityType.MEMO, requestBody: { view_ids: viewIds } });
    },
    [projectId, reorderViewOrder],
  );
  const handleCreateView = useCallback(
    (
      name: string,
      layout: SearchViewLayout,
      filters = emptyFilter(),
      groupBy?: GroupConfig_MemoColumns_,
      sorts?: Sort_MemoColumns_[],
    ) => {
      const usedNames = new Set(views.map((view) => view.name.toLocaleLowerCase()));
      let uniqueName = name;
      let suffix = 2;
      while (usedNames.has(uniqueName.toLocaleLowerCase())) uniqueName = `${name} ${suffix++}`;
      createView.mutate(
        { requestBody: { project_id: projectId, name: uniqueName, layout, filters, group_by: groupBy, sorts } },
        { onSuccess: (view) => handleSelectView(view.id) },
      );
      setCreateMenuAnchor(null);
    },
    [createView, handleSelectView, projectId, views],
  );
  const handleCreateProjectMemo = useCallback(() => {
    createMemo.mutate(
      {
        attachedObjectId: projectId,
        attachedObjectType: AttachedObjectType.PROJECT,
        requestBody: { title: "Untitled", content: "", content_json: "" },
      },
      { onSuccess: (memo) => onSelectMemo(memo.id) },
    );
  }, [createMemo, onSelectMemo, projectId]);
  const handleDebouncedUpdate = useCallback(
    (requestBody: MemoSearchViewUpdate) => {
      if (!activeView) return;
      pendingUpdate.current = { ...pendingUpdate.current, ...requestBody };
      clearTimeout(updateTimer.current);
      updateTimer.current = setTimeout(() => {
        const update = pendingUpdate.current;
        pendingUpdate.current = {};
        updateQueue.current = updateQueue.current
          .then(() => updateView.mutateAsync({ viewId: activeView.id, requestBody: update }))
          .then(
            () => undefined,
            () => undefined,
          );
      }, 400);
    },
    [activeView, updateView],
  );
  const handleDeleteView = useCallback(() => {
    if (!activeView) return;
    const view = activeView;
    setViewMenuAnchor(null);
    openConfirmationDialog({
      type: "DELETE",
      text: `Do you really want to delete the view "${view.name}"? This action cannot be undone!`,
      onAccept: () => {
        deleteView.mutate({ viewId: view.id }, { onSuccess: () => setActiveViewId(undefined) });
      },
    });
  }, [activeView, deleteView, openConfirmationDialog]);
  const handleRenameView = useCallback(() => {
    if (!activeView) return;
    setRenameValue(activeView.name);
    setRenameDialogOpen(true);
    setViewMenuAnchor(null);
  }, [activeView]);
  const handleCloseRenameDialog = useCallback(() => {
    setRenameDialogOpen(false);
  }, []);
  const handleSubmitRename = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!activeView || renameError || normalizedRenameValue === activeView.name) return;
      updateView.mutate(
        { viewId: activeView.id, requestBody: { name: normalizedRenameValue } },
        { onSuccess: handleCloseRenameDialog },
      );
    },
    [activeView, handleCloseRenameDialog, normalizedRenameValue, renameError, updateView],
  );

  const frameProps = { projectId, scope, onSelectMemo, onCreateProjectMemo: handleCreateProjectMemo };
  const renderToolbar = useCallback(() => {
    return (
      <Button startIcon={<ArrowBackIcon />} onClick={() => onSelectMemo()}>
        Back to workspace
      </Button>
    );
  }, [onSelectMemo]);
  if (selectedMemoId)
    return (
      <WorkspaceFrame {...frameProps}>
        <MemoEditorPane memoId={selectedMemoId} onDelete={() => onSelectMemo()} renderToolbar={renderToolbar} />
      </WorkspaceFrame>
    );

  return (
    <WorkspaceFrame {...frameProps}>
      <Stack height="100%" minWidth={0}>
        <WorkspaceToolbar
          views={views}
          view={activeView}
          activeViewId={activeViewId}
          searchQuery={searchQuery}
          expertMode={expertMode}
          columnInfo={columnInfo}
          onSelectView={handleSelectView}
          onOpenViewMenu={setViewMenuAnchor}
          onOpenCreateMenu={setCreateMenuAnchor}
          onReorderViews={handleReorderViews}
          onSearchQueryChange={setSearchQuery}
          onExpertModeChange={setExpertMode}
          onUpdate={handleDebouncedUpdate}
        />
        {activeView ? (
          <WorkspaceResults
            projectId={projectId}
            view={activeView}
            searchQuery={searchQuery}
            onSelectMemo={onSelectMemo}
          />
        ) : viewsQuery.isLoading ? (
          <CircularProgress sx={{ m: "auto" }} />
        ) : (
          <Stack alignItems="center" justifyContent="center" spacing={2} flex={1}>
            <Typography variant="h5">Build your memo workspace</Typography>
            <Typography color="text.secondary">Create a view to organize every memo in this project.</Typography>
            <Button variant="contained" onClick={() => handleCreateView("All memos", SearchViewLayout.TABLE)}>
              Create All memos view
            </Button>
          </Stack>
        )}
      </Stack>
      <Menu anchorEl={viewMenuAnchor} open={Boolean(viewMenuAnchor)} onClose={() => setViewMenuAnchor(null)}>
        <MenuItem onClick={handleRenameView}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteView}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
      <Dialog open={renameDialogOpen} onClose={handleCloseRenameDialog} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleSubmitRename}>
          <DialogTitle>Rename view</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              label="View name"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              error={Boolean(renameError)}
              helperText={renameError}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseRenameDialog}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={Boolean(renameError) || normalizedRenameValue === activeView?.name || updateView.isPending}
            >
              Rename
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <CreateViewMenu
        anchorEl={createMenuAnchor}
        onClose={() => setCreateMenuAnchor(null)}
        onCreate={handleCreateView}
        userId={userId}
      />
    </WorkspaceFrame>
  );
}

interface WorkspaceFrameProps {
  projectId: number;
  scope: string;
  onSelectMemo: (memoId?: number) => void;
  onCreateProjectMemo: () => void;
  children: ReactNode;
}
function WorkspaceFrame({ projectId, scope, onSelectMemo, onCreateProjectMemo, children }: WorkspaceFrameProps) {
  const recents = useAppSelector((state) => state.logbook.workspaces[scope]?.recents ?? []);
  const projectFilter = useMemo(
    () =>
      expressionFilter(
        MemoColumns.M_ATTACHED_OBJECT_TYPE,
        AttachedObjectTypeOperator.ATTACHED_OBJECT_TYPE_EQUALS,
        AttachedObjectType.PROJECT,
      ),
    [],
  );
  const projectMemos = MemoHooks.useQueryMemos({
    project_id: projectId,
    filter: projectFilter,
    sorts: [{ column: MemoColumns.M_TITLE, direction: SortDirection.ASC }],
    page_size: 200,
  });
  const projects = projectMemos.data?.pages.flatMap((page) => page.items) ?? [];
  const sidebar = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ListItemButton
        onClick={() => onSelectMemo()}
        sx={{ flex: "0 0 48px", minWidth: 0, overflow: "hidden", borderBottom: 1, borderColor: "divider" }}
      >
        <ListItemIcon sx={{ flexShrink: 0 }}>{getIconComponent(Icon.HOME)}</ListItemIcon>
        <ListItemText sx={{ minWidth: 0 }} primary={<Typography noWrap>Memo Workspace</Typography>} />
      </ListItemButton>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Stack p={1} spacing={1} alignItems="stretch">
          <Typography variant="overline" color="text.secondary" noWrap>
            Recents
          </Typography>
          {recents.length ? (
            recents.map((memo) => <SidebarMemoButton key={memo.id} memo={memo} onSelectMemo={onSelectMemo} />)
          ) : (
            <Typography variant="caption" color="text.secondary" noWrap>
              No recently opened memos
            </Typography>
          )}
          <Divider />
          <Stack direction="row" alignItems="center" justifyContent="space-between" minWidth={0}>
            <Typography variant="overline" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
              Project Memos
            </Typography>
            <IconButton size="small" onClick={onCreateProjectMemo} sx={{ flexShrink: 0 }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
          {projects.map((memo) => (
            <SidebarMemoButton key={memo.id} memo={memo} onSelectMemo={onSelectMemo} />
          ))}
        </Stack>
      </Box>
    </Box>
  );
  return (
    <SidebarContentLayout
      sidebar={sidebar}
      content={<Box sx={{ height: "100%", bgcolor: "background.paper" }}>{children}</Box>}
    />
  );
}

interface SidebarMemoButtonProps {
  memo: { id: number; title: string; icon?: string | null };
  onSelectMemo: (memoId: number) => void;
}

function SidebarMemoButton({ memo, onSelectMemo }: SidebarMemoButtonProps) {
  return (
    <Button
      fullWidth
      size="small"
      onClick={() => onSelectMemo(memo.id)}
      sx={{ minWidth: 0, justifyContent: "flex-start", textTransform: "none", overflow: "hidden" }}
    >
      <Stack direction="row" spacing={1} alignItems="center" minWidth={0} width="100%">
        {memo.icon && <EmojiGlyph emoji={memo.icon} />}
        <Typography component="span" variant="body2" noWrap sx={{ minWidth: 0, textAlign: "left" }}>
          {memo.title || "Untitled"}
        </Typography>
      </Stack>
    </Button>
  );
}

const layoutIcons: Record<SearchViewLayout, ReactNode> = {
  [SearchViewLayout.TABLE]: <TableRowsIcon fontSize="small" />,
  [SearchViewLayout.LIST]: <ViewListIcon fontSize="small" />,
  [SearchViewLayout.BOARD]: <ViewColumnIcon fontSize="small" />,
  [SearchViewLayout.GALLERY]: <GridViewIcon fontSize="small" />,
  [SearchViewLayout.FEED]: <DynamicFeedIcon fontSize="small" />,
};

const columnIcons: Record<MemoColumns, ReactNode> = {
  [MemoColumns.M_TITLE]: <TitleIcon fontSize="small" />,
  [MemoColumns.M_CONTENT]: <SubjectIcon fontSize="small" />,
  [MemoColumns.M_USER_ID]: <AccountCircleIcon fontSize="small" />,
  [MemoColumns.M_ATTACHED_OBJECT_TYPE]: <CategoryIcon fontSize="small" />,
  [MemoColumns.M_ATTACHED_OBJECT_ID]: <LinkIcon fontSize="small" />,
  [MemoColumns.M_CREATED]: <CalendarMonthIcon fontSize="small" />,
  [MemoColumns.M_UPDATED]: <UpdateIcon fontSize="small" />,
  [MemoColumns.M_FAVORITE]: <StarBorderIcon fontSize="small" />,
};

const groupIcons: Record<MemoColumns, ReactNode> = columnIcons;

const formatOptionLabel = (value: string) => {
  const label = value.replaceAll("_", " ");
  return `${label[0].toUpperCase()}${label.slice(1)}`;
};

interface MenuGridButtonProps {
  icon: ReactNode;
  label: string;
  selected?: boolean;
  onClick: () => void;
}

function MenuGridButton({ icon, label, selected = false, onClick }: MenuGridButtonProps) {
  return (
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{
        minWidth: 0,
        height: "100%",
        py: 1,
        flexDirection: "column",
        justifyContent: "center",
        gap: 0.5,
      }}
    >
      {icon}
      <ListItemText
        sx={{ m: 0, width: "100%" }}
        primary={
          <Typography
            component="span"
            variant="body2"
            textAlign="center"
            lineHeight={1.2}
            sx={{ display: "block", width: "100%" }}
          >
            {label}
          </Typography>
        }
      />
    </ListItemButton>
  );
}

function MenuButtonGrid({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <Box
      sx={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: "1fr", gap: 0.5 }}
    >
      {children}
    </Box>
  );
}

function LayoutGrid({
  selectedLayout,
  onSelect,
  columns = 3,
}: {
  selectedLayout?: SearchViewLayout;
  onSelect: (layout: SearchViewLayout) => void;
  columns?: number;
}) {
  return (
    <MenuButtonGrid columns={columns}>
      {Object.values(SearchViewLayout).map((layout) => (
        <MenuGridButton
          key={layout}
          icon={layoutIcons[layout]}
          label={formatOptionLabel(layout)}
          selected={selectedLayout === layout}
          onClick={() => onSelect(layout)}
        />
      ))}
    </MenuButtonGrid>
  );
}

interface SortableViewChipProps {
  view: MemoSearchViewRead;
  isActive: boolean;
  onSelect: (viewId: number) => void;
  onOpenMenu: (anchor: HTMLElement) => void;
}

function SortableViewChip({ view, isActive, onSelect, onOpenMenu }: SortableViewChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: view.id });

  return (
    <Chip
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      size="small"
      label={view.name}
      color={isActive ? "primary" : "default"}
      variant={isActive ? "filled" : "outlined"}
      onClick={(event) => (isActive ? onOpenMenu(event.currentTarget) : onSelect(view.id))}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.25 : 1,
      }}
      sx={{ flexShrink: 0, cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
    />
  );
}

interface WorkspaceToolbarProps {
  views: MemoSearchViewRead[];
  view?: MemoSearchViewRead;
  activeViewId?: number;
  searchQuery: string;
  expertMode: boolean;
  columnInfo?: Record<string, ColumnInfo>;
  onSelectView: (viewId: number) => void;
  onOpenViewMenu: (anchor: HTMLElement) => void;
  onOpenCreateMenu: (anchor: HTMLElement) => void;
  onReorderViews: (viewIds: number[]) => void;
  onSearchQueryChange: (value: string) => void;
  onExpertModeChange: (value: boolean) => void;
  onUpdate: (request: MemoSearchViewUpdate) => void;
}

function WorkspaceToolbar({
  views,
  view,
  activeViewId,
  searchQuery,
  expertMode,
  columnInfo,
  onSelectView,
  onOpenViewMenu,
  onOpenCreateMenu,
  onReorderViews,
  onSearchQueryChange,
  onExpertModeChange,
  onUpdate,
}: WorkspaceToolbarProps) {
  const [layoutMenuAnchor, setLayoutMenuAnchor] = useState<HTMLElement | null>(null);
  const [groupMenuAnchor, setGroupMenuAnchor] = useState<HTMLElement | null>(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState<HTMLElement | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [activeDragViewId, setActiveDragViewId] = useState<number>();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const filterCount = view ? countFilterExpressions(view.filters) : 0;
  const isDateGroup =
    view?.group_by?.field === MemoColumns.M_CREATED || view?.group_by?.field === MemoColumns.M_UPDATED;
  const activeSort = view?.sorts?.[0];
  const activeDragView = views.find((currentView) => currentView.id === activeDragViewId);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (typeof event.active.id === "number") {
      setActiveDragViewId(event.active.id);
    }
  }, []);
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragViewId(undefined);
      if (!event.over || typeof event.active.id !== "number" || typeof event.over.id !== "number") return;
      const sourceIndex = views.findIndex((currentView) => currentView.id === event.active.id);
      const destinationIndex = views.findIndex((currentView) => currentView.id === event.over?.id);
      if (sourceIndex < 0 || destinationIndex < 0 || sourceIndex === destinationIndex) return;
      onReorderViews(arrayMove(views, sourceIndex, destinationIndex).map((currentView) => currentView.id));
    },
    [onReorderViews, views],
  );
  const handleDragCancel = useCallback(() => {
    setActiveDragViewId(undefined);
  }, []);

  const handleLayoutChange = (layout: SearchViewLayout) => {
    onUpdate({ layout });
    setLayoutMenuAnchor(null);
  };
  const handleGroupChange = (group?: MemoColumns) => {
    onUpdate(
      group
        ? {
            group_by: {
              field: group,
              date_granularity:
                group === MemoColumns.M_CREATED || group === MemoColumns.M_UPDATED ? DateGranularity.DAY : undefined,
            },
          }
        : { group_by: null },
    );
    setGroupMenuAnchor(null);
  };
  const handleGranularityChange = (granularity: DateGranularity) => {
    if (!view?.group_by) return;
    onUpdate({ group_by: { field: view.group_by.field, date_granularity: granularity } });
    setGroupMenuAnchor(null);
  };
  const handleSortChange = (column?: MemoColumns) => {
    onUpdate(column ? { sorts: [{ column, direction: activeSort?.direction ?? SortDirection.ASC }] } : { sorts: null });
    setSortMenuAnchor(null);
  };
  const handleToggleSort = () => {
    if (!activeSort) return;
    onUpdate({
      sorts: [
        {
          column: activeSort.column,
          direction: activeSort.direction === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC,
        },
      ],
    });
    setSortMenuAnchor(null);
  };

  return (
    <DATSToolbar
      variant="dense"
      disableGutters
      sx={{ px: 0.5, flexShrink: 0, justifyContent: "flex-start", minWidth: 0 }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: 1, minWidth: 0, overflowX: "auto" }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis, restrictToFirstScrollableAncestor]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={views.map((currentView) => currentView.id)} strategy={horizontalListSortingStrategy}>
            {views.map((currentView) => (
              <SortableViewChip
                key={currentView.id}
                view={currentView}
                isActive={currentView.id === activeViewId}
                onSelect={onSelectView}
                onOpenMenu={onOpenViewMenu}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeDragView ? (
              <Chip
                size="small"
                label={activeDragView.name}
                color={activeDragView.id === activeViewId ? "primary" : "default"}
                variant={activeDragView.id === activeViewId ? "filled" : "outlined"}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
        <Tooltip title="Add view">
          <IconButton size="small" onClick={(event) => onOpenCreateMenu(event.currentTarget)}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {view ? (
        <Stack direction="row" spacing={0.25} alignItems="center" sx={{ flexShrink: 0 }}>
          <Tooltip title={`Layout: ${formatOptionLabel(view.layout)}`}>
            <IconButton size="small" color="primary" onClick={(event) => setLayoutMenuAnchor(event.currentTarget)}>
              {layoutIcons[view.layout]}
            </IconButton>
          </Tooltip>
          {columnInfo ? (
            <FilterDialog
              anchorEl={null}
              filterName={view.name}
              filter={view.filters}
              defaultFilterExpression={defaultFilterExpression}
              column2Info={columnInfo}
              expertMode={expertMode}
              onExpertModeChange={onExpertModeChange}
              onFilterChange={(filter) => onUpdate({ filters: filter })}
              iconOnly
              iconButtonProps={{ size: "small", color: filterCount > 0 ? "primary" : "default" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
            />
          ) : null}
          <Tooltip title="Sort">
            <IconButton
              size="small"
              color={activeSort ? "primary" : "default"}
              onClick={(event) => setSortMenuAnchor(event.currentTarget)}
            >
              <SortIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Group">
            <IconButton
              size="small"
              color={view.group_by ? "primary" : "default"}
              onClick={(event) => setGroupMenuAnchor(event.currentTarget)}
            >
              <WorkspacesIcon />
            </IconButton>
          </Tooltip>
          {searchExpanded ? (
            <TextField
              autoFocus
              size="small"
              placeholder="Search memos"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              sx={{ width: 220 }}
            />
          ) : null}
          <Tooltip title="Search">
            <IconButton
              size="small"
              color={searchExpanded || searchQuery ? "primary" : "default"}
              onClick={() => setSearchExpanded((expanded) => !expanded)}
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : null}

      <Menu
        anchorEl={layoutMenuAnchor}
        open={Boolean(layoutMenuAnchor)}
        onClose={() => setLayoutMenuAnchor(null)}
        slotProps={{ paper: { sx: { width: 280 } } }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, pt: 0.5, pb: 1 }}>
          Change layout
        </Typography>
        <Box sx={{ px: 1 }}>
          <LayoutGrid selectedLayout={view?.layout} onSelect={handleLayoutChange} />
        </Box>
      </Menu>
      <Menu anchorEl={sortMenuAnchor} open={Boolean(sortMenuAnchor)} onClose={() => setSortMenuAnchor(null)}>
        <MenuItem selected={!activeSort} onClick={() => handleSortChange()}>
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>No sorting</ListItemText>
        </MenuItem>
        <Divider />
        {Object.values(MemoColumns).map((column) => (
          <MenuItem key={column} selected={activeSort?.column === column} onClick={() => handleSortChange(column)}>
            <ListItemIcon>{columnIcons[column]}</ListItemIcon>
            <ListItemText>{columnInfo?.[column]?.label ?? column}</ListItemText>
          </MenuItem>
        ))}
        {activeSort ? (
          <>
            <Divider />
            <MenuItem onClick={handleToggleSort}>
              <ListItemIcon>
                {activeSort.direction === SortDirection.ASC ? (
                  <ArrowUpwardIcon fontSize="small" />
                ) : (
                  <ArrowDownwardIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText>{activeSort.direction === SortDirection.ASC ? "Ascending" : "Descending"}</ListItemText>
            </MenuItem>
          </>
        ) : null}
      </Menu>
      <Menu anchorEl={groupMenuAnchor} open={Boolean(groupMenuAnchor)} onClose={() => setGroupMenuAnchor(null)}>
        <MenuItem selected={!view?.group_by} onClick={() => handleGroupChange()}>
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>No grouping</ListItemText>
        </MenuItem>
        <Divider />
        {Object.values(MemoColumns).map((group) => (
          <MenuItem key={group} selected={view?.group_by?.field === group} onClick={() => handleGroupChange(group)}>
            <ListItemIcon>{groupIcons[group]}</ListItemIcon>
            <ListItemText>{columnInfo?.[group]?.label ?? group}</ListItemText>
          </MenuItem>
        ))}
        {isDateGroup ? (
          <>
            <Divider />
            {Object.values(DateGranularity).map((granularity) => (
              <MenuItem
                key={granularity}
                selected={view?.group_by?.date_granularity === granularity}
                onClick={() => handleGranularityChange(granularity)}
              >
                <ListItemIcon>
                  <CalendarMonthIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{formatOptionLabel(granularity)}</ListItemText>
              </MenuItem>
            ))}
          </>
        ) : null}
      </Menu>
    </DATSToolbar>
  );
}

function WorkspaceResults({
  projectId,
  view,
  searchQuery,
  onSelectMemo,
}: {
  projectId: number;
  view: MemoSearchViewRead;
  searchQuery: string;
  onSelectMemo: (memoId: number) => void;
}) {
  if (view.layout === SearchViewLayout.BOARD && !view.group_by)
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Choose a grouping to display this board.
      </Alert>
    );
  if (view.group_by)
    return <GroupedResults projectId={projectId} view={view} searchQuery={searchQuery} onSelectMemo={onSelectMemo} />;
  return <MemoResultList projectId={projectId} view={view} searchQuery={searchQuery} onSelectMemo={onSelectMemo} />;
}
function MemoResultList({
  projectId,
  view,
  searchQuery,
  onSelectMemo,
  groupKey,
}: {
  projectId: number;
  view: MemoSearchViewRead;
  searchQuery: string;
  onSelectMemo: (memoId: number) => void;
  groupKey?: string;
}) {
  const query = MemoHooks.useQueryMemos({
    project_id: projectId,
    search_query: searchQuery,
    filter: view.filters,
    sorts: view.sorts,
    group_by: view.group_by,
    group_key: groupKey,
    page_size: PAGE_SIZE,
  });
  const memos = query.data?.pages.flatMap((page) => page.items) ?? [];
  if (query.isLoading) return <CircularProgress sx={{ m: 2 }} />;
  if (query.isError)
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {query.error.message}
      </Alert>
    );
  return (
    <Stack minHeight={0} overflow="auto">
      <MemoLayout layout={view.layout} memos={memos} onSelectMemo={onSelectMemo} />
      {query.hasNextPage && <Button onClick={() => query.fetchNextPage()}>Load more</Button>}
    </Stack>
  );
}
function GroupedResults({
  projectId,
  view,
  searchQuery,
  onSelectMemo,
}: {
  projectId: number;
  view: MemoSearchViewRead;
  searchQuery: string;
  onSelectMemo: (memoId: number) => void;
}) {
  const groupBy = view.group_by;
  const query = MemoHooks.useQueryMemoGroups(
    {
      project_id: projectId,
      search_query: searchQuery,
      filter: view.filters,
      group_by: groupBy ?? { field: MemoColumns.M_ATTACHED_OBJECT_ID },
      page_size: 100,
    },
    Boolean(groupBy),
  );
  const groups = query.data?.pages.flatMap((page) => page.items) ?? [];
  if (query.isLoading) return <CircularProgress sx={{ m: 2 }} />;
  return (
    <Stack
      direction={view.layout === SearchViewLayout.BOARD ? "row" : "column"}
      spacing={2}
      p={2}
      overflow="auto"
      alignItems="flex-start"
    >
      {groups.map((group) => (
        <MemoGroup
          key={group.key}
          group={group}
          projectId={projectId}
          view={view}
          searchQuery={searchQuery}
          onSelectMemo={onSelectMemo}
        />
      ))}
    </Stack>
  );
}
function MemoGroup({
  group,
  projectId,
  view,
  searchQuery,
  onSelectMemo,
}: {
  group: GroupSummary;
  projectId: number;
  view: MemoSearchViewRead;
  searchQuery: string;
  onSelectMemo: (memoId: number) => void;
}) {
  const createMemo = MemoHooks.useCreateMemo();
  const handleCreate = () => {
    if (group.target_id != null && group.target_type)
      createMemo.mutate(
        {
          attachedObjectId: group.target_id,
          attachedObjectType: group.target_type as AttachedObjectType,
          requestBody: { title: "Untitled", content: "", content_json: "" },
        },
        { onSuccess: (memo) => onSelectMemo(memo.id) },
      );
  };
  const nestedView = { ...view, layout: view.layout === SearchViewLayout.BOARD ? SearchViewLayout.LIST : view.layout };
  return (
    <Paper
      variant="outlined"
      sx={{
        minWidth: view.layout === SearchViewLayout.BOARD ? 320 : "100%",
        maxWidth: view.layout === SearchViewLayout.BOARD ? 380 : undefined,
      }}
    >
      <Stack direction="row" p={1} alignItems="center">
        <Typography fontWeight={600} flex={1}>
          {group.label} ({group.total_results})
        </Typography>
        {group.target_id != null && (
          <IconButton size="small" onClick={handleCreate}>
            <AddIcon />
          </IconButton>
        )}
      </Stack>
      <Divider />
      <MemoResultList
        projectId={projectId}
        view={nestedView}
        searchQuery={searchQuery}
        groupKey={group.key}
        onSelectMemo={onSelectMemo}
      />
    </Paper>
  );
}
function MemoLayout({
  layout,
  memos,
  onSelectMemo,
}: {
  layout: SearchViewLayout;
  memos: MemoRow[];
  onSelectMemo: (memoId: number) => void;
}) {
  if (!memos.length)
    return (
      <Typography color="text.secondary" p={2}>
        No memos match this view.
      </Typography>
    );
  if (layout === SearchViewLayout.TABLE)
    return (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Attached to</TableCell>
            <TableCell>Author</TableCell>
            <TableCell>Updated</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {memos.map((memo) => (
            <TableRow hover key={memo.id} onClick={() => onSelectMemo(memo.id)} sx={{ cursor: "pointer" }}>
              <TableCell>{memo.title}</TableCell>
              <TableCell>{formatOptionLabel(memo.attached_object_type)}</TableCell>
              <TableCell>
                <UserRenderer user={memo.user_id} />
              </TableCell>
              <TableCell>{formatDate(memo.updated)}</TableCell>
              <TableCell>
                <FavoriteButton memo={memo} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  if (layout === SearchViewLayout.GALLERY)
    return (
      <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(240px, 1fr))" gap={2} p={2}>
        {memos.map((memo) => (
          <MemoCard key={memo.id} memo={memo} onSelectMemo={onSelectMemo} />
        ))}
      </Box>
    );
  if (layout === SearchViewLayout.FEED)
    return (
      <Stack spacing={2} p={2}>
        {memos.map((memo) => (
          <Paper key={memo.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row">
              <Typography variant="h6" flex={1} onClick={() => onSelectMemo(memo.id)} sx={{ cursor: "pointer" }}>
                {memo.title}
              </Typography>
              <FavoriteButton memo={memo} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              <UserRenderer user={memo.user_id} /> · {formatDate(memo.updated)} ·{" "}
              {formatOptionLabel(memo.attached_object_type)}
            </Typography>
            <Typography mt={1} whiteSpace="pre-wrap">
              {memo.content_excerpt}
            </Typography>
          </Paper>
        ))}
      </Stack>
    );
  return (
    <Stack>
      {memos.map((memo) => (
        <CardActionArea key={memo.id} onClick={() => onSelectMemo(memo.id)}>
          <Stack direction="row" p={1.5} alignItems="center">
            <Box flex={1}>
              <Typography fontWeight={600}>{memo.title}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {memo.content_excerpt || formatOptionLabel(memo.attached_object_type)}
              </Typography>
            </Box>
            <FavoriteButton memo={memo} />
          </Stack>
        </CardActionArea>
      ))}
    </Stack>
  );
}
function MemoCard({ memo, onSelectMemo }: { memo: MemoRow; onSelectMemo: (memoId: number) => void }) {
  return (
    <Card variant="outlined">
      <CardActionArea onClick={() => onSelectMemo(memo.id)}>
        <CardContent>
          <Stack direction="row">
            <Typography variant="h6" flex={1}>
              {memo.title}
            </Typography>
            <FavoriteButton memo={memo} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {formatOptionLabel(memo.attached_object_type)}
          </Typography>
          <Typography mt={1}>{memo.content_excerpt}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
function FavoriteButton({ memo }: { memo: MemoRow }) {
  const favorite = MemoHooks.useFavoriteMemos();
  return (
    <IconButton
      size="small"
      onClick={(event) => {
        event.stopPropagation();
        favorite.mutate({ memoIds: [memo.id], isFavorite: !memo.is_favorite });
      }}
    >
      {memo.is_favorite ? <StarIcon color="warning" /> : <StarBorderIcon />}
    </IconButton>
  );
}

interface CreateViewMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onCreate: (
    name: string,
    layout: SearchViewLayout,
    filters?: MyFilter<MemoColumns>,
    groupBy?: GroupConfig_MemoColumns_,
    sorts?: Sort_MemoColumns_[],
  ) => void;
  userId: number;
}
function CreateViewMenu({ anchorEl, onClose, onCreate, userId }: CreateViewMenuProps) {
  const myMemos: MyFilter<MemoColumns> = {
    id: crypto.randomUUID(),
    logic_operator: LogicalOperator.AND,
    items: [{ id: crypto.randomUUID(), column: MemoColumns.M_USER_ID, operator: IDOperator.ID_EQUALS, value: userId }],
  };
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 500, maxWidth: "calc(100vw - 32px)" } } }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, pt: 0.5, pb: 1 }}>
        Layout
      </Typography>
      <Box sx={{ px: 1 }}>
        <LayoutGrid columns={4} onSelect={(layout) => onCreate(`${formatOptionLabel(layout)} view`, layout)} />
      </Box>
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, pb: 1 }}>
        Templates
      </Typography>
      <Box sx={{ px: 1 }}>
        <MenuButtonGrid columns={4}>
          <MenuGridButton
            icon={getIconComponent(Icon.MEMO, { fontSize: "small" })}
            label="All memos"
            onClick={() => onCreate("All memos", SearchViewLayout.TABLE)}
          />
          <MenuGridButton
            icon={<AccountCircleIcon fontSize="small" />}
            label="My Memos"
            onClick={() => onCreate("My Memos", SearchViewLayout.LIST, myMemos)}
          />
          <MenuGridButton
            icon={<StarBorderIcon fontSize="small" />}
            label="Favorite Memos"
            onClick={() =>
              onCreate(
                "Favorite Memos",
                SearchViewLayout.GALLERY,
                expressionFilter(MemoColumns.M_FAVORITE, BooleanOperator.BOOLEAN_EQUALS, true),
              )
            }
          />
          <MenuGridButton
            icon={<UpdateIcon fontSize="small" />}
            label="Recent Memos"
            onClick={() =>
              onCreate("Recent Memos", SearchViewLayout.FEED, emptyFilter(), undefined, [
                { column: MemoColumns.M_UPDATED, direction: SortDirection.DESC },
              ])
            }
          />
          <MenuGridButton
            icon={getIconComponent(Icon.PROJECT, { fontSize: "small" })}
            label="Project Memos"
            onClick={() =>
              onCreate(
                "Project Memos",
                SearchViewLayout.GALLERY,
                expressionFilter(
                  MemoColumns.M_ATTACHED_OBJECT_TYPE,
                  AttachedObjectTypeOperator.ATTACHED_OBJECT_TYPE_EQUALS,
                  AttachedObjectType.PROJECT,
                ),
              )
            }
          />
          <MenuGridButton
            icon={getIconComponent(Icon.DOCUMENT, { fontSize: "small" })}
            label="Document Memos"
            onClick={() =>
              onCreate(
                "Document Memos",
                SearchViewLayout.LIST,
                expressionFilter(
                  MemoColumns.M_ATTACHED_OBJECT_TYPE,
                  AttachedObjectTypeOperator.ATTACHED_OBJECT_TYPE_EQUALS,
                  AttachedObjectType.SOURCE_DOCUMENT,
                ),
              )
            }
          />
          <MenuGridButton
            icon={getIconComponent(Icon.CODE, { fontSize: "small" })}
            label="Code Memos"
            onClick={() =>
              onCreate(
                "Code Memos",
                SearchViewLayout.LIST,
                expressionFilter(
                  MemoColumns.M_ATTACHED_OBJECT_TYPE,
                  AttachedObjectTypeOperator.ATTACHED_OBJECT_TYPE_EQUALS,
                  AttachedObjectType.CODE,
                ),
              )
            }
          />
          <MenuGridButton
            icon={getIconComponent(Icon.TAG, { fontSize: "small" })}
            label="Tag Memos"
            onClick={() =>
              onCreate(
                "Tag Memos",
                SearchViewLayout.LIST,
                expressionFilter(
                  MemoColumns.M_ATTACHED_OBJECT_TYPE,
                  AttachedObjectTypeOperator.ATTACHED_OBJECT_TYPE_EQUALS,
                  AttachedObjectType.TAG,
                ),
              )
            }
          />
          <MenuGridButton
            icon={getIconComponent(Icon.SPAN_ANNOTATION, { fontSize: "small" })}
            label="Span Memos"
            onClick={() =>
              onCreate(
                "Span Memos",
                SearchViewLayout.LIST,
                expressionFilter(
                  MemoColumns.M_ATTACHED_OBJECT_TYPE,
                  AttachedObjectTypeOperator.ATTACHED_OBJECT_TYPE_EQUALS,
                  AttachedObjectType.SPAN_ANNOTATION,
                ),
              )
            }
          />
          <MenuGridButton
            icon={getIconComponent(Icon.BBOX_ANNOTATION, { fontSize: "small" })}
            label="BBox Memos"
            onClick={() =>
              onCreate(
                "BBox Memos",
                SearchViewLayout.LIST,
                expressionFilter(
                  MemoColumns.M_ATTACHED_OBJECT_TYPE,
                  AttachedObjectTypeOperator.ATTACHED_OBJECT_TYPE_EQUALS,
                  AttachedObjectType.BBOX_ANNOTATION,
                ),
              )
            }
          />
          <MenuGridButton
            icon={getIconComponent(Icon.SENTENCE_ANNOTATION, { fontSize: "small" })}
            label="Sentence Memos"
            onClick={() =>
              onCreate(
                "Sentence Memos",
                SearchViewLayout.LIST,
                expressionFilter(
                  MemoColumns.M_ATTACHED_OBJECT_TYPE,
                  AttachedObjectTypeOperator.ATTACHED_OBJECT_TYPE_EQUALS,
                  AttachedObjectType.SENTENCE_ANNOTATION,
                ),
              )
            }
          />
        </MenuButtonGrid>
      </Box>
    </Menu>
  );
}
