import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { Button, Dialog, DialogActions, DialogContent, Stack } from "@mui/material";
import { useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { TimelineAnalysisConcept } from "../../../api/openapi/models/TimelineAnalysisConcept.ts";
import { FormColorPicker } from "../../../components/FormInputs/FormColorPicker.tsx";
import { FormText } from "../../../components/FormInputs/FormText.tsx";
import { DATSDialogHeader } from "../../../components/MUI/DATSDialogHeader.tsx";
import { useDialogMaximize } from "../../../hooks/useDialogMaximize.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { ConceptFilterEditor } from "./ConceptFilterEditor.tsx";

interface ConceptEditorProps {
  onUpdate: (concept: TimelineAnalysisConcept) => void;
  onCancel: (concept: TimelineAnalysisConcept) => void;
}

export function ConceptEditor({ onUpdate, onCancel }: ConceptEditorProps) {
  // global client state (redux)
  const currentConcept = useAppSelector((state) => state.timelineAnalysis.currentConcept);
  const conceptEditorOpen = useAppSelector((state) => state.timelineAnalysis.conceptEditorOpen);

  // event handling
  const handleClose = () => {
    onCancel(currentConcept);
  };

  // use react hook form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<TimelineAnalysisConcept>();

  // reset form when dialog opens
  useEffect(() => {
    if (conceptEditorOpen) {
      reset(currentConcept);
    }
  }, [conceptEditorOpen, currentConcept, reset]);

  // form handling
  const handleUpdate: SubmitHandler<TimelineAnalysisConcept> = (data) => {
    onUpdate(data);
  };
  const handleError: SubmitErrorHandler<TimelineAnalysisConcept> = (data) => console.error(data);

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
          <ConceptFilterEditor />
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
