import { ErrorMessage } from "@hookform/error-message";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { TimelineAnalysisConcept_Output } from "../../../api/openapi/models/TimelineAnalysisConcept_Output.ts";
import FormColorPicker from "../../../components/FormInputs/FormColorPicker.tsx";
import FormText from "../../../components/FormInputs/FormText.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import ConceptFilterEditor from "./ConceptFilterEditor.tsx";

interface ConceptEditorProps {
  onUpdate: (concept: TimelineAnalysisConcept_Output) => void;
  onCancel: (concept: TimelineAnalysisConcept_Output) => void;
}

function ConceptEditor({ onUpdate, onCancel }: ConceptEditorProps) {
  // global client state (redux)
  const currentConcept = useAppSelector((state) => state.timelineAnalysis.currentConcept);
  const conceptEditorOpen = useAppSelector((state) => state.timelineAnalysis.conceptEditorOpen);

  // event handling
  const handleClose = () => {
    onCancel(currentConcept);
  };

  return (
    <Dialog open={conceptEditorOpen} onClose={handleClose} fullWidth maxWidth="md">
      <ConceptEditorForm concept={currentConcept} onUpdate={onUpdate} onClose={handleClose} />
    </Dialog>
  );
}

interface ConceptEditorFormProps {
  concept: TimelineAnalysisConcept_Output;
  onUpdate: (concept: TimelineAnalysisConcept_Output) => void;
  onClose: () => void;
}

function ConceptEditorForm({ concept, onUpdate, onClose }: ConceptEditorFormProps) {
  // use react hook form
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<TimelineAnalysisConcept_Output>({
    defaultValues: concept,
  });

  // form handling
  const handleUpdate: SubmitHandler<TimelineAnalysisConcept_Output> = (data) => {
    onUpdate(data);
  };
  const handleError: SubmitErrorHandler<TimelineAnalysisConcept_Output> = (data) => console.error(data);

  return (
    <form onSubmit={handleSubmit(handleUpdate, handleError)}>
      <DialogTitle>Add / edit concept</DialogTitle>
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
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" color="success" type="submit">
          Save
        </Button>
      </DialogActions>
    </form>
  );
}

export default ConceptEditor;
