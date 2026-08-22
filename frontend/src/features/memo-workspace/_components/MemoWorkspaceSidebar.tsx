import { MemoHooks } from "@api/hooks/MemoHooks";
import { EmojiGlyph } from "@components/emoji";
import { getIconComponent, Icon } from "@components/icons";
import { MyFilter } from "@core/filter";
import { LinkButton, LinkListItemButton } from "@core/navigation";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { AttachedObjectTypeOperator } from "@models/AttachedObjectTypeOperator";
import { BooleanOperator } from "@models/BooleanOperator";
import { LogicalOperator } from "@models/LogicalOperator";
import { MemoColumns } from "@models/MemoColumns";
import { MemoRow } from "@models/MemoRow";
import { Page_MemoRow_ } from "@models/Page_MemoRow_";
import { SortDirection } from "@models/SortDirection";
import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { InfiniteData, UseQueryResult } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { memo, useCallback } from "react";

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

const flattenMemoPagesToItems = (data: InfiniteData<Page_MemoRow_> | undefined): MemoRow[] => {
  if (!data) return [];
  return data.pages.flatMap((page) => page.items);
};

interface MemoWorkspaceSidebarProps {
  projectId: number;
  scope: string;
}

export const MemoWorkspaceSidebar = memo(({ projectId, scope }: MemoWorkspaceSidebarProps) => {
  const recents = useAppSelector((state) => state.memoWorkspace.workspaces[scope]?.recents ?? []);
  const navigate = useNavigate();
  const createMemo = MemoHooks.useCreateMemo();

  const handleCreateProjectMemo = useCallback(() => {
    createMemo.mutate(
      {
        attachedObjectId: projectId,
        attachedObjectType: AttachedObjectType.PROJECT,
        requestBody: { title: "Untitled", content: "", content_json: "" },
      },
      {
        onSuccess: (memo) =>
          navigate({
            to: "/project/$projectId/memo-workspace/detail",
            params: { projectId },
            search: { memoId: memo.id },
          }),
      },
    );
  }, [createMemo, navigate, projectId]);
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
        sx={{ flex: "0 0 48px", minWidth: 0, overflow: "hidden", borderBottom: 1, borderColor: "divider" }}
      >
        <ListItemIcon sx={{ flexShrink: 0 }}>{getIconComponent(Icon.HOME)}</ListItemIcon>
        <ListItemText sx={{ minWidth: 0 }} primary={<Typography noWrap>Memo Workspace</Typography>} />
      </LinkListItemButton>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Stack p={1} spacing={1} alignItems="stretch">
          <Typography variant="overline" color="text.secondary" noWrap>
            Recents
          </Typography>
          {recents.length ? (
            recents.map((memo) => <SidebarMemoButton key={memo.id} memo={memo} projectId={projectId} />)
          ) : (
            <Typography variant="caption" color="text.secondary" noWrap>
              No recently opened memos
            </Typography>
          )}
          <Divider />
          <Typography variant="overline" color="text.secondary" noWrap>
            Favorites
          </Typography>
          <SidebarMemoSection query={favoriteMemos} emptyText="No favorite memos" projectId={projectId} />
          <Divider />
          <Stack direction="row" alignItems="center" justifyContent="space-between" minWidth={0}>
            <Typography variant="overline" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
              Project Memos
            </Typography>
            <IconButton size="small" onClick={handleCreateProjectMemo} sx={{ flexShrink: 0 }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
          <SidebarMemoSection query={projectMemos} emptyText="No project memos" projectId={projectId} />
        </Stack>
      </Box>
    </Box>
  );
});

interface SidebarMemoSectionProps {
  query: UseQueryResult<MemoRow[], Error>;
  emptyText: string;
  projectId: number;
}

function SidebarMemoSection({ query, emptyText, projectId }: SidebarMemoSectionProps) {
  if (query.isPending) return <CircularProgress size={20} sx={{ alignSelf: "center" }} />;
  if (query.isError) return <Typography color="error">{query.error.message}</Typography>;
  if (!query.data) {
    return (
      <Typography variant="caption" color="text.secondary" noWrap>
        {emptyText}
      </Typography>
    );
  }
  return query.data.map((memo) => <SidebarMemoButton key={memo.id} memo={memo} projectId={projectId} />);
}

interface SidebarMemoButtonProps {
  memo: { id: number; title: string; icon?: string | null };
  projectId: number;
}

function SidebarMemoButton({ memo, projectId }: SidebarMemoButtonProps) {
  return (
    <LinkButton
      fullWidth
      size="small"
      to="/project/$projectId/memo-workspace/detail"
      params={{ projectId }}
      search={{ memoId: memo.id }}
      sx={{ minWidth: 0, justifyContent: "flex-start", textTransform: "none", overflow: "hidden" }}
    >
      <Stack direction="row" spacing={1} alignItems="center" minWidth={0} width="100%">
        {memo.icon && <EmojiGlyph emoji={memo.icon} />}
        <Typography component="span" variant="body2" noWrap sx={{ minWidth: 0, textAlign: "left" }}>
          {memo.title || "Untitled"}
        </Typography>
      </Stack>
    </LinkButton>
  );
}
