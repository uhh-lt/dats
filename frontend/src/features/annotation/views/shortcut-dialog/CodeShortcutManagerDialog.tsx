import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { ITree, TreeExplorer } from "@components/tree-explorer";
import { useAuth } from "@core/auth";
import { CodeRenderer, useComputeCodeTree } from "@core/code";
import { useOpenConfirmationDialog } from "@core/notification";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { CodeRead } from "@models/CodeRead";
import BackspaceIcon from "@mui/icons-material/Backspace";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import SquareIcon from "@mui/icons-material/Square";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useDialog } from "@store/global/dialogBusSlice";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback, useMemo, useState } from "react";
import {
  CODE_SHORTCUT_KEYS,
  CodeShortcutActions,
  CodeShortcutKey,
  selectCodeShortcuts,
} from "../../store/codeShortcutSlice";

interface CodeShortcutManagerDialogProps {
  projectId: number;
}

export function CodeShortcutManagerDialog({ projectId }: CodeShortcutManagerDialogProps) {
  const { isOpen, close } = useDialog("codeShortcutManager");
  const { isMaximized, toggleMaximize } = useDialogMaximize();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { codeTree, allCodes } = useComputeCodeTree();
  const bindings = useAppSelector((state) => selectCodeShortcuts(state, user?.id, projectId));

  const [selectedCodeId, setSelectedCodeId] = useState<number>();
  const [expandedCodeIds, setExpandedCodeIds] = useState<string[]>([]);
  const [codeFilter, setCodeFilter] = useState("");

  const codesById = useMemo(() => new Map((allCodes.data ?? []).map((code) => [code.id, code])), [allCodes.data]);
  const selectedCode = selectedCodeId === undefined ? undefined : codesById.get(selectedCodeId);

  const handleSelectedCodeChange = useCallback(
    (_event: React.SyntheticEvent | null, nodeIds: string[] | string | null) => {
      if (nodeIds === null) {
        setSelectedCodeId(undefined);
        return;
      }

      setSelectedCodeId(parseInt(Array.isArray(nodeIds) ? nodeIds[0] : nodeIds, 10));
    },
    [],
  );

  const handleAssign = useCallback(
    (key: CodeShortcutKey) => {
      if (!user || !selectedCode) {
        return;
      }

      dispatch(
        CodeShortcutActions.assign({
          userId: user.id,
          projectId,
          key,
          codeId: selectedCode.id,
        }),
      );
    },
    [dispatch, projectId, selectedCode, user],
  );

  const handleClear = useCallback(
    (key: CodeShortcutKey) => {
      if (!user) {
        return;
      }

      dispatch(CodeShortcutActions.clear({ userId: user.id, projectId, key }));
    },
    [dispatch, projectId, user],
  );

  const handleClearAll = useCallback(() => {
    if (!user) {
      return;
    }

    openConfirmationDialog({
      type: "DELETE",
      text: "Do you really want to clear all code shortcuts for this project?",
      onAccept: () => dispatch(CodeShortcutActions.clearAll({ userId: user.id, projectId })),
    });
  }, [dispatch, openConfirmationDialog, projectId, user]);

  const renderNode = useCallback(
    (node: ITree<CodeRead>) => (
      <Typography
        variant="body2"
        sx={{
          fontWeight: "inherit",
          flexGrow: 1,
        }}
      >
        {node.data.name}
      </Typography>
    ),
    [],
  );

  return (
    <Dialog open={isOpen} onClose={close} maxWidth="lg" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title="Code shortcuts"
        onClose={close}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <DialogContent sx={{ minHeight: 560 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(320px, 1fr) minmax(360px, 1fr)" },
            gap: 3,
            height: "100%",
          }}
        >
          <Paper variant="outlined" sx={{ minHeight: 500, overflow: "hidden" }}>
            {codeTree ? (
              <TreeExplorer
                dataTree={codeTree}
                dataIcon={SquareIcon}
                showFilter
                dataFilter={codeFilter}
                onDataFilterChange={setCodeFilter}
                expandedItems={expandedCodeIds}
                onExpandedItemsChange={setExpandedCodeIds}
                selectedItems={selectedCodeId}
                onSelectedItemsChange={handleSelectedCodeChange}
                renderNode={renderNode}
              />
            ) : null}
          </Paper>

          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">Assign a shortcut</Typography>
              <Typography color="text.secondary" variant="body2">
                Select a code, then choose one of the digit slots below. Changes are saved immediately.
              </Typography>
            </Box>
            <Paper variant="outlined" sx={{ p: 2, minHeight: 64 }}>
              {selectedCode ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <KeyboardIcon color="action" />
                  <CodeRenderer code={selectedCode} />
                </Stack>
              ) : (
                <Typography color="text.secondary">No code selected</Typography>
              )}
            </Paper>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
              {CODE_SHORTCUT_KEYS.map((key) => {
                const codeId = bindings[key];
                const code = codeId === undefined ? undefined : codesById.get(codeId);
                return (
                  <Paper key={key} variant="outlined" sx={{ display: "flex", alignItems: "center", p: 0.5 }}>
                    <Button
                      color="inherit"
                      disabled={!selectedCode}
                      onClick={() => handleAssign(key)}
                      sx={{ flexGrow: 1, justifyContent: "flex-start", minWidth: 0, textTransform: "none" }}
                    >
                      <Chip label={key} size="small" sx={{ mr: 1, minWidth: 32 }} />
                      {code ? (
                        <Box
                          sx={{ width: 16, height: 16, bgcolor: code.color, borderRadius: 0.5, mr: 1, flexShrink: 0 }}
                        />
                      ) : null}
                      <Typography noWrap variant="body2">
                        {code?.name ?? (codeId === undefined ? "Unassigned" : "Unavailable code")}
                      </Typography>
                    </Button>
                    <Tooltip title={`Clear shortcut ${key}`}>
                      <span>
                        <IconButton size="small" disabled={codeId === undefined} onClick={() => handleClear(key)}>
                          <BackspaceIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Paper>
                );
              })}
            </Box>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="error" onClick={handleClearAll} disabled={CODE_SHORTCUT_KEYS.every((key) => !bindings[key])}>
          Clear all shortcuts
        </Button>
        <Button onClick={close}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
