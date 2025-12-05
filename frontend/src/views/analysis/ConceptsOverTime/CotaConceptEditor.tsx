import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { Button, Dialog, DialogActions, DialogContent, Stack } from "@mui/material";
import { useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { COTAConcept } from "../../../api/openapi/models/COTAConcept.ts";
import FormColorPicker from "../../../components/FormInputs/FormColorPicker.tsx";
import FormText from "../../../components/FormInputs/FormText.tsx";
import DATSDialogHeader from "../../../components/MUI/DATSDialogHeader.tsx";
import { useDialogMaximize } from "../../../hooks/useDialogMaximize.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";

interface CotaConceptEditorProps {
  onUpdate: (concept: COTAConcept) => void;
  onCancel: (concept: COTAConcept) => void;
  isDescriptionEditable: boolean;
}

function CotaConceptEditor({ onUpdate, onCancel, isDescriptionEditable }: CotaConceptEditorProps) {
  // redux
  const currentConcept = useAppSelector((state) => state.cota.currentConcept);
  const conceptEditorOpen = useAppSelector((state) => state.cota.conceptEditorOpen);

  // event handling
  const handleClose = () => {
    onCancel(currentConcept);
  };

  // form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<COTAConcept>();

  // reset form when dialog opens
  useEffect(() => {
    if (conceptEditorOpen) {
      reset(currentConcept);
    }
  }, [conceptEditorOpen, currentConcept, reset]);

  // form handling
  const handleUpdate: SubmitHandler<COTAConcept> = (data) => {
    onUpdate(data);
  };
  const handleError: SubmitErrorHandler<COTAConcept> = (data) => console.error(data);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <Dialog
      open={conceptEditorOpen}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMaximized}
      component="form"
      onSubmit={handleSubmit(handleUpdate, handleError)}
    >
      <DATSDialogHeader
        title="Edit concept"
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <FormText
            name="name"
            control={control}
            rules={{
              required: "Name is required",
            }}
            textFieldProps={{
              label: "Name",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.name),
              helperText: <ErrorMessage errors={errors} name="name" />,
              slotProps: {
                inputLabel: { shrink: true },
              },
            }}
          />
          <FormText
            name="description"
            control={control}
            rules={{
              required: "Description is required",
            }}
            textFieldProps={{
              label: "Description",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.description),
              helperText: isDescriptionEditable ? (
                <ErrorMessage errors={errors} name="description" />
              ) : (
                "Please reset the analysis to edit the concept description."
              ),
              slotProps: {
                inputLabel: { shrink: true },
              },
              disabled: !isDescriptionEditable,
            }}
          />
          <FormColorPicker
            name="color"
            control={control}
            rules={{
              required: "Color is required",
            }}
            textFieldProps={{
              label: "Color",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.color),
              helperText: <ErrorMessage errors={errors} name="color" />,
              slotProps: {
                inputLabel: { shrink: true },
              },
              InputProps: {
                readOnly: true,
              },
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" color="success" type="submit" fullWidth startIcon={<SaveIcon />}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CotaConceptEditor;
