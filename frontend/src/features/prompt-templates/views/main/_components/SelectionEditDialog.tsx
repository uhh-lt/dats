import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormText, FormTextMultiline } from "@components/form-inputs";
import { ErrorMessage } from "@hookform/error-message";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { Alert, Button, Dialog, DialogActions, DialogContent, IconButton, Stack, Tooltip } from "@mui/material";
import { closeOnEscape } from "@utils/dialogUtils";
import { useCallback, useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { SelectionDefinition } from "../_hooks/usePromptTemplateEditor";

type SelectionEditValues = Pick<SelectionDefinition, "name" | "description">;

interface SelectionEditDialogProps {
  // the prompt's definition of the code, tag or metadata field
  definition: SelectionDefinition;
  // what the selection is, e.g. "code"
  noun: string;
  onSave: (definition: SelectionDefinition) => void;
}

/** Edits the prompt's own name and description of a code, tag or metadata field; the project stays unchanged. */
export function SelectionEditDialog({ definition, noun, onSave }: SelectionEditDialogProps) {
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

  return (
    <>
      <Tooltip title={`Edit the prompt's definition of the ${noun}`}>
        <IconButton size="small" onClick={handleOpen}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog
        open={isOpen}
        onClose={closeOnEscape(handleClose)}
        maxWidth="sm"
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
              This changes only the prompt. It is saved with the next version; push it to change the project's {noun}.
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
                slotProps: { inputLabel: { shrink: true } },
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
                minRows: 3,
                error: Boolean(errors.description),
                helperText: <ErrorMessage errors={errors} name="description" />,
                slotProps: { inputLabel: { shrink: true } },
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
