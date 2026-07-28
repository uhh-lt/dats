import { ITree, TreeExplorer } from "@components/tree-explorer";
import { CodeBranchHooks } from "@api/hooks/CodeBranchHooks";
import { CodeHooks } from "@api/hooks/CodeHooks";
import { useOpenConfirmationDialog } from "@core/notification";
import { ProjectActions } from "@store/global/projectSlice";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SquareIcon from "@mui/icons-material/Square";
import {
  Box,
  BoxProps,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { SyntheticEvent, useCallback, useEffect, useState } from "react";
import { CodeExportButton } from "../CodeExportButton";
import { CodeCreateListItemButton } from "../dialog";
import { CodeExplorerActionMenu } from "./_components/CodeExplorerActionMenu";
import { useComputeCodeTree } from "./useComputeCodeTree";
import { useTabNavigate } from "@core/navigation/tabs";
import { CodeReadWithParent } from "../codeTypes";

interface CodeExplorerProps extends BoxProps {
  // code selection
  selectedCodeId?: number;
  onSelectedCodeIdChange: (codeId: number | undefined) => void;
  // code expansion
  expandedCodeIds: string[];
  onExpandedCodeIdsChange: (ids: string[]) => void;
  // code hiding
  hiddenCodeIds: number[];
  onToggleCodeVisibility: (codeIds: number[]) => void;
  onHoverCodeIdChange: (codeId: number | undefined) => void;
}

export function CodeExplorer({
  selectedCodeId,
  onSelectedCodeIdChange,
  expandedCodeIds,
  onExpandedCodeIdsChange,
  hiddenCodeIds,
  onToggleCodeVisibility,
  onHoverCodeIdChange,
  ...props
}: CodeExplorerProps) {
  // custom hooks
  const { codeTree, allCodes } = useComputeCodeTree();

  // Determine parentCodeId for the create dialog based on the selected code
  const selectedCode = allCodes.data?.find((code) => code.id === selectedCodeId);
  const parentCodeId = selectedCode && !selectedCode.is_system ? selectedCode.id : undefined;

  // local client state
  const [codeFilter, setCodeFilter] = useState<string>("");

  useEffect(() => {
    if (!selectedCodeId || allCodes.isLoading) return;
    if (allCodes.data?.some((code) => code.id === selectedCodeId)) return;
    onSelectedCodeIdChange(undefined);
  }, [allCodes.data, allCodes.isLoading, onSelectedCodeIdChange, selectedCodeId]);

  const handleSelectedCodeChange = useCallback(
    (_event: SyntheticEvent | null, nodeIds: string[] | string | null) => {
      if (nodeIds === null) {
        onSelectedCodeIdChange(undefined);
      } else {
        const id = parseInt(Array.isArray(nodeIds) ? nodeIds[0] : nodeIds);
        onSelectedCodeIdChange(selectedCodeId === id ? undefined : id);
      }
    },
    [onSelectedCodeIdChange, selectedCodeId],
  );

  const renderNode = useCallback(
    (node: ITree<CodeReadWithParent>) => (
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        sx={{ flexGrow: 1, minWidth: 0 }}
        onMouseEnter={() => onHoverCodeIdChange(node.data.id)}
        onMouseLeave={() => onHoverCodeIdChange(undefined)}
      >
        <Typography
          variant="body2"
          noWrap
          sx={{
            fontWeight: "inherit",
            flexGrow: 1,
            ...(hiddenCodeIds.includes(node.data.id) && { textDecoration: "line-through" }),
          }}
        >
          {node.data.name}
        </Typography>
        {node.data.branch_id && (
          <Chip
            size="small"
            label={node.data.base_main_code_id ? "Changed" : "New"}
            color="secondary"
            variant="outlined"
          />
        )}
      </Stack>
    ),
    [onHoverCodeIdChange, hiddenCodeIds],
  );

  const renderActions = useCallback(
    (node: ITree<CodeReadWithParent>) => (
      <CodeExplorerActionMenu
        node={node}
        isHidden={hiddenCodeIds.includes(node.data.id)}
        onToggleVisibility={onToggleCodeVisibility}
      />
    ),
    [hiddenCodeIds, onToggleCodeVisibility],
  );

  return (
    <Box {...props}>
      <CodeBranchSelector />
      {codeTree && (
        <TreeExplorer
          sx={{ pt: 0 }}
          dataIcon={SquareIcon}
          // data
          dataTree={codeTree}
          // filter
          showFilter
          dataFilter={codeFilter}
          onDataFilterChange={setCodeFilter}
          // expansion
          expandedItems={expandedCodeIds}
          onExpandedItemsChange={onExpandedCodeIdsChange}
          // selection
          selectedItems={selectedCodeId}
          onSelectedItemsChange={handleSelectedCodeChange}
          // render node
          renderNode={renderNode}
          // actions
          renderActions={renderActions}
          // components
          listActions={<ListActions parentCodeId={parentCodeId} />}
        />
      )}
    </Box>
  );
}

function CodeBranchSelector() {
  const dispatch = useAppDispatch();
  const projectId = useAppSelector((state) => state.project.projectId);
  const branchId = CodeHooks.useSelectedCodeBranchId();
  const branches = CodeBranchHooks.useListBranches(projectId);
  const changes = CodeBranchHooks.useBranchChanges(branchId);
  const createBranch = CodeBranchHooks.useCreateBranch();
  const archiveBranch = CodeBranchHooks.useArchiveBranch();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const tabNavigate = useTabNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!projectId || !branchId || branches.isLoading) return;
    if (branches.data?.some((branch) => branch.id === branchId)) return;
    dispatch(ProjectActions.selectCodeBranch({ projectId, branchId: null }));
  }, [branchId, branches.data, branches.isLoading, dispatch, projectId]);

  const handleBranchChange = useCallback(
    (value: number | "main") => {
      if (!projectId) return;
      dispatch(ProjectActions.selectCodeBranch({ projectId, branchId: value === "main" ? null : value }));
    },
    [dispatch, projectId],
  );

  const handleCreateBranch = useCallback(() => {
    if (!projectId || !branchName.trim()) return;
    createBranch.mutate(
      { requestBody: { project_id: projectId, name: branchName.trim() } },
      {
        onSuccess: (branch) => {
          dispatch(ProjectActions.selectCodeBranch({ projectId, branchId: branch.id }));
          setBranchName("");
          setCreateOpen(false);
        },
      },
    );
  }, [branchName, createBranch, dispatch, projectId]);

  const handleReviewChanges = useCallback(() => {
    if (!projectId) return;
    setMenuAnchor(null);
    tabNavigate({ to: "/project/$projectId/annotation/codebook", params: { projectId } });
  }, [projectId, tabNavigate]);

  const handleArchiveBranch = useCallback(() => {
    if (!branchId || !projectId) return;
    setMenuAnchor(null);
    openConfirmationDialog({
      type: "DELETE",
      text: `Archive this branch and discard ${changes.data?.length ?? 0} active change(s)?`,
      onAccept: () => {
        archiveBranch.mutate(
          { branchId },
          { onSuccess: () => dispatch(ProjectActions.selectCodeBranch({ projectId, branchId: null })) },
        );
      },
    });
  }, [archiveBranch, branchId, changes.data?.length, dispatch, openConfirmationDialog, projectId]);

  if (!projectId) return null;

  return (
    <>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ p: 1, borderBottom: 1, borderColor: "divider" }}>
        <Select
          size="small"
          fullWidth
          value={branchId ?? "main"}
          onChange={(event) => handleBranchChange(event.target.value === "main" ? "main" : Number(event.target.value))}
          aria-label="Code branch"
        >
          <MenuItem value="main">Main</MenuItem>
          {branches.data?.map((branch) => (
            <MenuItem key={branch.id} value={branch.id}>
              {branch.name}
            </MenuItem>
          ))}
        </Select>
        <Tooltip title="Create branch">
          <IconButton size="small" onClick={() => setCreateOpen(true)}>
            <AddIcon />
          </IconButton>
        </Tooltip>
        {branchId && (
          <Tooltip title="Branch actions">
            <IconButton size="small" onClick={(event) => setMenuAnchor(event.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={handleReviewChanges}>Review &amp; merge changes ({changes.data?.length ?? 0})</MenuItem>
        <MenuItem onClick={handleArchiveBranch}>Archive branch</MenuItem>
      </Menu>
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Create code branch</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Branch name"
            value={branchName}
            onChange={(event) => setBranchName(event.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateBranch}
            disabled={!branchName.trim()}
            loading={createBranch.isPending}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function ListActions({ parentCodeId }: { parentCodeId: number | undefined }) {
  return (
    <>
      <CodeCreateListItemButton parentCodeId={parentCodeId} />
      <CodeExportButton />
    </>
  );
}
