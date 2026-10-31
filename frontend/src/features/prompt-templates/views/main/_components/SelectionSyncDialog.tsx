import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import SyncIcon from "@mui/icons-material/Sync";
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { closeOnEscape } from "@utils/dialogUtils";
import { MouseEvent, ReactNode, useCallback, useMemo, useState } from "react";
import { isDifferent, SelectionDefinition, SelectionItem } from "../_hooks/usePromptTemplateEditor";

type SyncDirection = "pull" | "push";

interface SelectionSyncDialogProps {
  // what a selection is, e.g. "code"
  noun: string;
  // the selections of the prompt with the project's definitions
  items: SelectionItem[];
  // the icon of a selection, e.g. the colored square of a code
  renderIcon: (item: SelectionItem) => ReactNode;
  onPull: (ids: number[]) => void;
  onPush: (ids: number[], onSuccess: () => void) => void;
  isPushing: boolean;
}

/**
 * Synchronizes the prompt's definitions of codes, tags or metadata fields with the project. It lists every selection
 * whose definitions differ; the checked ones are pulled (the prompt gets the project's definitions) or pushed (the
 * project gets the prompt's, for every member). The chosen side simply wins.
 */
export function SelectionSyncDialog({ noun, items, renderIcon, onPull, onPush, isPushing }: SelectionSyncDialogProps) {
  const differing = useMemo(() => items.filter(isDifferent), [items]);
  const differingIds = useMemo(() => differing.map((item) => item.local.id), [differing]);

  // all differing selections are checked and the direction is pull when the dialog opens
  const [direction, setDirection] = useState<SyncDirection>("pull");
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const handleOpenDialog = useCallback(() => {
    setDirection("pull");
    setCheckedIds(differingIds);
  }, [differingIds]);
  const { isOpen, open: handleOpen, close: handleClose } = useDialog({ onOpen: handleOpenDialog });
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  const handleToggle = useCallback(
    (id: number) =>
      setCheckedIds((current) => (current.includes(id) ? current.filter((other) => other !== id) : [...current, id])),
    [],
  );
  const handleToggleAll = useCallback(
    () => setCheckedIds((current) => (current.length === differingIds.length ? [] : differingIds)),
    [differingIds],
  );
  const handleChangeDirection = useCallback((_: MouseEvent<HTMLElement>, value: SyncDirection | null) => {
    if (value) setDirection(value);
  }, []);
  const handleApply = useCallback(() => {
    if (direction === "push") {
      onPush(checkedIds, handleClose);
      return;
    }
    onPull(checkedIds);
    handleClose();
  }, [direction, onPull, onPush, checkedIds, handleClose]);

  const isPull = direction === "pull";
  const DirectionIcon = isPull ? ArrowForwardIcon : ArrowBackIcon;
  return (
    <>
      <Tooltip
        title={
          differing.length === 0
            ? `The prompt defines all ${noun}s as the project does`
            : `Synchronize the ${noun}s with the project by pulling or pushing their definitions`
        }
      >
        <span>
          <IconButton size="small" onClick={handleOpen} disabled={differing.length === 0}>
            <Badge badgeContent={differing.length} color="warning" max={99}>
              <SyncIcon fontSize="small" />
            </Badge>
          </IconButton>
        </span>
      </Tooltip>
      <Dialog open={isOpen} onClose={closeOnEscape(handleClose)} maxWidth="md" fullWidth fullScreen={isMaximized}>
        <DATSDialogHeader
          title={`Synchronize ${noun}s with the project`}
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        <DialogContent>
          <Stack spacing={2}>
            <ToggleButtonGroup exclusive fullWidth size="small" value={direction} onChange={handleChangeDirection}>
              <ToggleButton value="pull" sx={{ gap: 1 }}>
                <ArrowDownwardIcon fontSize="small" /> Pull from the project
              </ToggleButton>
              <ToggleButton value="push" sx={{ gap: 1 }}>
                <ArrowUpwardIcon fontSize="small" /> Push to the project
              </ToggleButton>
            </ToggleButtonGroup>
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
                      <Checkbox size="small" checked={checkedIds.includes(item.local.id)} />
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top" }}>
                      {item.project && (
                        <DefinitionCell definition={item.project} other={item.local} icon={renderIcon(item)} />
                      )}
                    </TableCell>
                    <TableCell padding="none">
                      <DirectionIcon fontSize="small" color={isPull ? "success" : "warning"} />
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top" }}>
                      {item.project && (
                        <DefinitionCell definition={item.local} other={item.project} icon={renderIcon(item)} />
                      )}
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
            loading={!isPull && isPushing}
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
  icon: ReactNode;
}

function DefinitionCell({ definition, other, icon }: DefinitionCellProps) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        {icon}
        <Box sx={highlightSx(definition.name !== other.name)}>
          <Typography variant="body2" fontWeight="medium">
            {definition.name}
          </Typography>
        </Box>
      </Stack>
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
