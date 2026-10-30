import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormText, FormTextMultiline } from "@components/form-inputs";
import { ErrorMessage } from "@hookform/error-message";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { closeOnEscape } from "@utils/dialogUtils";
import { ReactNode, useCallback, useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { isDifferent, SelectionDefinition, SelectionItem } from "../_hooks/usePromptTemplateEditor";

type SelectionEditValues = Pick<SelectionDefinition, "name" | "description">;

interface SelectionEditDialogProps {
  // the selection with the prompt's and the project's definition
  item: SelectionItem;
  // what the selection is, e.g. "code"
  noun: string;
  // the icon of the selection, e.g. the colored square of a code
  icon: ReactNode;
  onSave: (definition: SelectionDefinition) => void;
  onRemove: (id: number) => void;
}

/**
 * Edits the prompt's own name and description of a code, tag or metadata field; the project stays unchanged.
 * Its trigger is the selection's row in the block: a click on the row or its pen opens the dialog.
 */
export function SelectionEditDialog({ item, noun, icon, onSave, onRemove }: SelectionEditDialogProps) {
  const { local: definition } = item;
  const { isOpen, open: handleOpen, close: handleClose } = useDialog();
  const { isMaximized, toggleMaximize } = useDialogMaximize();
  const nameLabel = definition.type === undefined ? "Name" : "Key";

  // form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<SelectionEditValues>();
  useEffect(() => {
    if (isOpen) reset({ name: definition.name, description: definition.description });
  }, [isOpen, definition, reset]);

  // form actions
  const handleSelectionUpdate = useCallback<SubmitHandler<SelectionEditValues>>(
    (values) => {
      onSave({ ...definition, name: values.name.trim(), description: values.description });
      handleClose();
    },
    [onSave, definition, handleClose],
  );
  const handleError: SubmitErrorHandler<SelectionEditValues> = (data) => console.error(data);
  const handleRemove = useCallback(() => onRemove(definition.id), [onRemove, definition.id]);

  return (
    <>
      <ListItem
        disablePadding
        secondaryAction={
          <Stack direction="row">
            <Tooltip title={`Edit the prompt's definition of the ${noun}`}>
              <IconButton size="small" onClick={handleOpen}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={`Remove the ${noun} from the prompt`}>
              <IconButton size="small" edge="end" onClick={handleRemove}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
        sx={{ "& .MuiListItemButton-root": { pr: 9 } }}
      >
        <ListItemButton onClick={handleOpen} sx={{ px: 1, py: 0.25 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>{icon}</ListItemIcon>
          <ListItemText
            disableTypography
            primary={
              <Stack direction="row" spacing={0.5} alignItems="center" minWidth={0}>
                <Typography variant="body2" noWrap sx={{ flexShrink: 0, maxWidth: "100%" }}>
                  {definition.name}
                </Typography>
                {item.project === undefined ? (
                  <Tooltip title={`The ${noun} was deleted from the project. Remove it from the prompt.`}>
                    <Chip size="small" color="error" variant="outlined" label="deleted" sx={{ minWidth: 0 }} />
                  </Tooltip>
                ) : (
                  isDifferent(item) && (
                    <Tooltip
                      title={`The prompt defines the ${noun} differently than the project. Synchronize to align them.`}
                    >
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label="differs from project"
                        sx={{ minWidth: 0 }}
                      />
                    </Tooltip>
                  )
                )}
              </Stack>
            }
          />
        </ListItemButton>
      </ListItem>
      <Dialog
        open={isOpen}
        onClose={closeOnEscape(handleClose)}
        maxWidth="md"
        fullWidth
        fullScreen={isMaximized}
        component="form"
        onSubmit={handleSubmit(handleSelectionUpdate, handleError)}
      >
        <DATSDialogHeader
          title={`Edit ${noun} ${definition.name} in this prompt`}
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        <DialogContent>
          <Stack spacing={3}>
            <Alert severity="info">
              This changes only the prompt and is saved with its next version. Synchronize to push it to the project's{" "}
              {noun}.
            </Alert>
            <FormText
              name="name"
              control={control}
              rules={{
                required: `${nameLabel} is required`,
                validate: (value) => value.trim() !== "" || `${nameLabel} is required`,
              }}
              textFieldProps={{
                label: nameLabel,
                variant: "standard",
                fullWidth: true,
                error: Boolean(errors.name),
                helperText: <ErrorMessage errors={errors} name="name" />,
                autoFocus: true,
              }}
            />
            <FormTextMultiline
              name="description"
              control={control}
              textFieldProps={{
                label: "Description",
                variant: "standard",
                fullWidth: true,
                minRows: 6,
                error: Boolean(errors.description),
                helperText: <ErrorMessage errors={errors} name="description" />,
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="success" startIcon={<SaveIcon />} fullWidth type="submit">
            Update {noun}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
