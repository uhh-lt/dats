import { MemoHooks } from "@api/hooks/MemoHooks";
import { EmojiGlyph } from "@components/emoji";
import { getIconComponent, Icon } from "@components/icons";
import { MyFilter } from "@core/filter";
import { LinkListItemButton } from "@core/navigation";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { AttachedObjectTypeOperator } from "@models/AttachedObjectTypeOperator";
import { BooleanOperator } from "@models/BooleanOperator";
import { LogicalOperator } from "@models/LogicalOperator";
import { MemoColumns } from "@models/MemoColumns";
import { MemoRead } from "@models/MemoRead";
import { Page_MemoRead_ } from "@models/Page_MemoRead_";
import { SortDirection } from "@models/SortDirection";
import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { InfiniteData } from "@tanstack/react-query";
import { memo, useCallback } from "react";
import { MemoWorkspaceActions } from "../../../store/memoWorkspaceSlice";

const projectFilter: MyFilter<MemoColumns> = {
  id: crypto.randomUUID(),
  logic_operator: LogicalOperator.AND,
  items: [
    {
      id: crypto.randomUUID(),
      column: MemoColumns.M_ATTACHED_OBJECT_TYPE,
      operator: AttachedObjectTypeOperator.ATTACHED_OBJECT_TYPE_EQUALS,
      value: AttachedObjectType.PROJECT,
    },
  ],
};

const favoriteFilter: MyFilter<MemoColumns> = {
  id: crypto.randomUUID(),
  logic_operator: LogicalOperator.AND,
  items: [
    {
      id: crypto.randomUUID(),
      column: MemoColumns.M_FAVORITE,
      operator: BooleanOperator.BOOLEAN_EQUALS,
      value: true,
    },
  ],
};

const flattenMemoPagesToItems = (data: InfiniteData<Page_MemoRead_> | undefined): MemoRead[] => {
  if (!data) return [];
  return data.pages.flatMap((page) => page.items);
};

interface MemoWorkspaceSidebarProps {
  projectId: number;
  scope: string;
}

export const MemoWorkspaceSidebar = memo(({ projectId, scope }: MemoWorkspaceSidebarProps) => {
  const dispatch = useAppDispatch();
  const createMemo = MemoHooks.useCreateMemo();
  const recentMemos = MemoHooks.useGetRecentMemos(projectId);
  const openMemoId = useAppSelector((state) => state.memoWorkspace.workspaces[scope]?.openMemoId);

  const handleCreateProjectMemo = useCallback(() => {
    createMemo.mutate(
      {
        attachedObjectId: projectId,
        attachedObjectType: AttachedObjectType.PROJECT,
        requestBody: { title: "Untitled", content: "", content_json: "" },
      },
      {
        onSuccess: (memo) => dispatch(MemoWorkspaceActions.openMemo({ scope, memoId: memo.id })),
      },
    );
  }, [createMemo, dispatch, scope, projectId]);
  const projectMemos = MemoHooks.useQueryMemos(
    {
      project_id: projectId,
      filter: projectFilter,
      sorts: [{ column: MemoColumns.M_TITLE, direction: SortDirection.ASC }],
      page_size: 200,
    },
    { select: flattenMemoPagesToItems },
  );

  const favoriteMemos = MemoHooks.useQueryMemos(
    {
      project_id: projectId,
      filter: favoriteFilter,
      sorts: [{ column: MemoColumns.M_TITLE, direction: SortDirection.ASC }],
      page_size: 200,
    },
    { select: flattenMemoPagesToItems },
  );

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <LinkListItemButton
        to="/project/$projectId/memo-workspace"
        params={{ projectId }}
        search={{}}
        sx={{ flex: "0 0 49px", minWidth: 0, overflow: "hidden", borderBottom: 1, borderColor: "divider" }}
      >
        <ListItemIcon sx={{ flexShrink: 0 }}>{getIconComponent(Icon.HOME)}</ListItemIcon>
        <ListItemText sx={{ minWidth: 0 }} primary={<Typography noWrap>Memo Workspace</Typography>} />
      </LinkListItemButton>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Stack>
          <Typography variant="overline" color="text.secondary" noWrap sx={{ px: 2, mt: 1 }}>
            Recents
          </Typography>
          <SidebarMemoSection
            query={recentMemos}
            emptyText="No recently opened memos"
            scope={scope}
            openMemoId={openMemoId}
          />
          <Divider sx={{ mx: 1 }} />
          <Typography variant="overline" color="text.secondary" noWrap sx={{ px: 2, mt: 1 }}>
            Favorites
          </Typography>
          <SidebarMemoSection
            query={favoriteMemos}
            emptyText="No favorite memos"
            scope={scope}
            openMemoId={openMemoId}
          />
          <Divider sx={{ mx: 1 }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between" minWidth={0} sx={{ px: 2, mt: 1 }}>
            <Typography variant="overline" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
              Project Memos
            </Typography>
            <IconButton size="small" onClick={handleCreateProjectMemo} sx={{ flexShrink: 0 }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
          <SidebarMemoSection query={projectMemos} emptyText="No project memos" scope={scope} openMemoId={openMemoId} />
        </Stack>
      </Box>
    </Box>
  );
});

/** The minimal memo shape needed to render a sidebar button. */
interface SidebarMemoItem {
  id: number;
  title: string;
  icon?: string | null;
}

/** Structural subset of UseQueryResult, so any query returning memo items is accepted. */
interface SidebarMemoQuery {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data: SidebarMemoItem[] | undefined;
}

interface SidebarMemoSectionProps {
  query: SidebarMemoQuery;
  emptyText: string;
  scope: string;
  openMemoId: number | undefined;
}

function SidebarMemoSection({ query, emptyText, scope, openMemoId }: SidebarMemoSectionProps) {
  if (query.isPending) return <CircularProgress size={20} sx={{ alignSelf: "center" }} />;
  if (query.isError)
    return (
      <Typography color="error" sx={{ px: 2 }}>
        {query.error?.message}
      </Typography>
    );
  const data = query.data ?? [];
  if (!data.length) {
    return (
      <Typography variant="caption" color="text.secondary" noWrap sx={{ px: 2 }}>
        {emptyText}
      </Typography>
    );
  }
  return (
    <List dense disablePadding>
      {data.map((memo) => (
        <SidebarMemoListItem
          key={memo.id}
          memoId={memo.id}
          title={memo.title}
          icon={memo.icon}
          scope={scope}
          selected={memo.id === openMemoId}
        />
      ))}
    </List>
  );
}

interface SidebarMemoListItemProps {
  memoId: number;
  title: string;
  icon?: string | null;
  scope: string;
  selected: boolean;
}

function SidebarMemoListItem({ memoId, title, icon, scope, selected }: SidebarMemoListItemProps) {
  const dispatch = useAppDispatch();

  const handleClick = useCallback(() => {
    dispatch(MemoWorkspaceActions.openMemo({ scope, memoId }));
  }, [dispatch, scope, memoId]);

  return (
    <ListItem disablePadding>
      <ListItemButton dense selected={selected} onClick={handleClick}>
        {icon && (
          <ListItemIcon sx={{ minWidth: 0, mr: 1 }}>
            <EmojiGlyph emoji={icon} />
          </ListItemIcon>
        )}
        <ListItemText primary={title || "Untitled"} primaryTypographyProps={{ variant: "body2", noWrap: true }} />
      </ListItemButton>
    </ListItem>
  );
}
