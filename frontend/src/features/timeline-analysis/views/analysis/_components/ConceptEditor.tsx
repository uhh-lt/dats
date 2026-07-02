import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormColorPicker, FormText } from "@components/form-inputs";
import { MyFilter, withDefaultFilterExpression } from "@core/filter";
import { ErrorMessage } from "@hookform/error-message";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { TimelineAnalysisConcept } from "@models/TimelineAnalysisConcept";
import SaveIcon from "@mui/icons-material/Save";
import { Button, Dialog, DialogActions, DialogContent, Stack } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { useEffect, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { ConceptFilterEditor } from "./ConceptFilterEditor";

interface ConceptEditorProps {
  onUpdate: (concept: TimelineAnalysisConcept, filter: MyFilter) => void;
  onCancel: () => void;
}

export function ConceptEditor({ onUpdate, onCancel }: ConceptEditorProps) {
  // global client state (redux)
  const currentConcept = useAppSelector((state) => state.timelineAnalysis.currentConcept);
  const conceptEditorOpen = useAppSelector((state) => state.timelineAnalysis.conceptEditorOpen);
  const defaultFilterExpression = useAppSelector((state) => state.timelineAnalysis.defaultFilterExpression);
  const column2Info = useAppSelector((state) => state.timelineAnalysis.column2Info);

  // local state for transient filter edits while dialog is open
  const [editableFilter, setEditableFilter] = useState<MyFilter>(() =>
    withDefaultFilterExpression(
      { ...currentConcept.ta_specific_filter.filter, id: currentConcept.id },
      defaultFilterExpression,
    ),
  );

  // event handling
  const handleClose = () => {
    onCancel();
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
      setEditableFilter(
        withDefaultFilterExpression(
          { ...currentConcept.ta_specific_filter.filter, id: currentConcept.id },
          defaultFilterExpression,
        ),
      );
    }
  }, [conceptEditorOpen, currentConcept, defaultFilterExpression, reset]);

  // form handling
  const handleUpdate: SubmitHandler<TimelineAnalysisConcept> = (data) => {
    onUpdate(data, editableFilter);
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
          <ConceptFilterEditor
            editableFilter={editableFilter}
            column2Info={column2Info}
            defaultFilterExpression={defaultFilterExpression}
            setEditableFilter={setEditableFilter}
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
