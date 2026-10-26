import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormColorPicker, FormText } from "@components/form-inputs";
import { MyFilter, TableInfoHooks, withDefaultFilterExpression } from "@core/filter";
import { ErrorMessage } from "@hookform/error-message";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { TimelineAnalysisConcept } from "@models/TimelineAnalysisConcept";
import { TimelineAnalysisRead } from "@models/TimelineAnalysisRead";
import SaveIcon from "@mui/icons-material/Save";
import { Button, Dialog, DialogActions, DialogContent, Stack } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { useEffect, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { timelineAnalysisQueries } from "../../../api/timelineAnalysisQueries";
import { ConceptFilterEditor } from "./ConceptFilterEditor";
import { closeOnEscape } from "@utils/dialogUtils";

interface ConceptEditorProps {
  timelineAnalysis: TimelineAnalysisRead;
  onUpdate: (concept: TimelineAnalysisConcept, filter: MyFilter) => void;
  onCancel: () => void;
}

export function ConceptEditor({ timelineAnalysis, onUpdate, onCancel }: ConceptEditorProps) {
  // global client state (redux)
  const currentConcept = useAppSelector((state) => state.timelineAnalysis.currentConcept);
  const conceptEditorOpen = useAppSelector((state) => state.timelineAnalysis.conceptEditorOpen);
  const defaultFilterExpression = useAppSelector((state) => state.timelineAnalysis.defaultFilterExpression);

  // global server state
  const columnInfoMap = TableInfoHooks.useColumnInfoMap(timelineAnalysisQueries.tableInfo(timelineAnalysis));

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

  // reset filter when dialog opens
  const [prevOpen, setPrevOpen] = useState(conceptEditorOpen);
  const [prevConceptId, setPrevConceptId] = useState(currentConcept.id);
  if (conceptEditorOpen !== prevOpen || currentConcept.id !== prevConceptId) {
    setPrevOpen(conceptEditorOpen);
    setPrevConceptId(currentConcept.id);

    if (conceptEditorOpen) {
      setEditableFilter(
        withDefaultFilterExpression(
          { ...currentConcept.ta_specific_filter.filter, id: currentConcept.id },
          defaultFilterExpression,
        ),
      );
    }
  }

  // reset form when dialog opens
  useEffect(() => {
    if (conceptEditorOpen) {
      reset(currentConcept);
    }
  }, [conceptEditorOpen, currentConcept, reset]);

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
      onClose={closeOnEscape(handleClose)}
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
            columnInfoMap={columnInfoMap}
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
