import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import {
  Alert,
  alpha,
  Badge,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  SxProps,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Theme,
  Tooltip,
  Typography,
} from "@mui/material";
import { closeOnEscape } from "@utils/dialogUtils";
import { useCallback, useMemo, useState } from "react";
import { isDifferent, SelectionDefinition, SelectionItem } from "../_hooks/usePromptTemplateEditor";

export type SyncMode = "pull" | "push";

interface SelectionSyncDialogProps {
  mode: SyncMode;
  // what a selection is, e.g. "code"
  noun: string;
  // the selections of the prompt with the project's definitions
  items: SelectionItem[];
  onApply: (ids: number[], onSuccess: () => void) => void;
  isPending: boolean;
}

/**
 * Pull: replaces the prompt's definitions of the checked selections with the project's.
 * Push: replaces the project's definitions with the prompt's, for every project member.
 * It lists every selection whose definitions differ; the chosen side simply wins.
 */
export function SelectionSyncDialog({ mode, noun, items, onApply, isPending }: SelectionSyncDialogProps) {
  // all differing selections are checked when the dialog opens
  const [uncheckedIds, setUncheckedIds] = useState<Set<number>>(new Set());
  const handleOpenDialog = useCallback(() => setUncheckedIds(new Set()), []);
  const { isOpen, open: handleOpen, close: handleClose } = useDialog({ onOpen: handleOpenDialog });
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  const differing = useMemo(() => items.filter(isDifferent), [items]);
  const checkedIds = differing.map((item) => item.local.id).filter((id) => !uncheckedIds.has(id));
  const handleToggle = useCallback(
    (id: number) =>
      setUncheckedIds((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    [],
  );
  const handleToggleAll = useCallback(
    () =>
      setUncheckedIds((current) => (current.size === 0 ? new Set(differing.map((item) => item.local.id)) : new Set())),
    [differing],
  );
  const handleApply = useCallback(() => onApply(checkedIds, handleClose), [onApply, checkedIds, handleClose]);

  const isPull = mode === "pull";
  const DirectionIcon = isPull ? ArrowForwardIcon : ArrowBackIcon;
  return (
    <>
      <Tooltip
        title={
          differing.length === 0
            ? `The prompt defines all ${noun}s as the project does`
            : isPull
              ? `Pull: replace the prompt's definitions of ${noun}s with the project's`
              : `Push: replace the project's definitions of ${noun}s with the prompt's`
        }
      >
        <span>
          <IconButton size="small" onClick={handleOpen} disabled={differing.length === 0}>
            <Badge badgeContent={differing.length} color="warning" max={99}>
              {isPull ? <ArrowDownwardIcon fontSize="small" /> : <ArrowUpwardIcon fontSize="small" />}
            </Badge>
          </IconButton>
        </span>
      </Tooltip>
      <Dialog open={isOpen} onClose={closeOnEscape(handleClose)} maxWidth="md" fullWidth fullScreen={isMaximized}>
        <DATSDialogHeader
          title={isPull ? `Pull ${noun}s from the project` : `Push ${noun}s to the project`}
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        <DialogContent>
          <Stack spacing={2}>
            {isPull ? (
              <Alert severity="info">
                The prompt gets the project's definitions of the checked {noun}s. Save the prompt to keep them.
              </Alert>
            ) : (
              <Alert severity="warning">
                The project's checked {noun}s get the prompt's names and descriptions. This changes them for every
                member of the project; other prompts keep their own definitions and show the {noun}s as differing.
              </Alert>
            )}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={checkedIds.length === differing.length}
                      indeterminate={checkedIds.length > 0 && checkedIds.length < differing.length}
                      onChange={handleToggleAll}
                    />
                  </TableCell>
                  <TableCell sx={{ width: "50%" }}>Project</TableCell>
                  <TableCell padding="none" />
                  <TableCell sx={{ width: "50%" }}>Prompt</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {differing.map((item) => (
                  <TableRow
                    key={item.local.id}
                    hover
                    onClick={() => handleToggle(item.local.id)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={!uncheckedIds.has(item.local.id)} />
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top" }}>
                      {item.project && <DefinitionCell definition={item.project} other={item.local} />}
                    </TableCell>
                    <TableCell padding="none">
                      <DirectionIcon fontSize="small" color="action" />
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top" }}>
                      {item.project && <DefinitionCell definition={item.local} other={item.project} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color={isPull ? "success" : "warning"}
            startIcon={isPull ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
            fullWidth
            disabled={checkedIds.length === 0}
            loading={isPending}
            loadingPosition="start"
            onClick={handleApply}
          >
            {isPull
              ? `Pull ${checkedIds.length} ${noun}(s) into the prompt`
              : `Push ${checkedIds.length} ${noun}(s) to the project`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// a field of a definition, highlighted if it differs from the other side
const highlightSx = (isChanged: boolean): SxProps<Theme> => [
  { px: 0.5, borderRadius: 0.5 },
  isChanged && ((theme) => ({ bgcolor: alpha(theme.palette.warning.main, 0.2) })),
];

interface DefinitionCellProps {
  definition: SelectionDefinition;
  // the definition of the other side; the fields that differ from it are highlighted
  other: SelectionDefinition;
}

function DefinitionCell({ definition, other }: DefinitionCellProps) {
  return (
    <Stack spacing={0.5}>
      <Box sx={highlightSx(definition.name !== other.name)}>
        <Typography variant="body2" fontWeight="medium">
          {definition.name}
        </Typography>
      </Box>
      {definition.type && (
        <Box sx={highlightSx(definition.type !== other.type)}>
          <Typography variant="caption" color="text.secondary">
            {definition.type}
          </Typography>
        </Box>
      )}
      <Box sx={highlightSx(definition.description !== other.description)}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ whiteSpace: "pre-wrap", fontStyle: definition.description ? undefined : "italic" }}
        >
          {definition.description || "No description"}
        </Typography>
      </Box>
    </Stack>
  );
}
