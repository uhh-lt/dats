import { ErrorMessage } from "@hookform/error-message";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { COTAConcept } from "../../../api/openapi/models/COTAConcept.ts";
import FormColorPicker from "../../../components/FormInputs/FormColorPicker.tsx";
import FormText from "../../../components/FormInputs/FormText.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";

interface CotaConceptEditorProps {
  onUpdate: (concept: COTAConcept) => void;
  onCancel: (concept: COTAConcept) => void;
  isDescriptionEditable: boolean;
}

function CotaConceptEditor({ onCancel, ...props }: CotaConceptEditorProps) {
  // redux
  const currentConcept = useAppSelector((state) => state.cota.currentConcept);
  const conceptEditorOpen = useAppSelector((state) => state.cota.conceptEditorOpen);

  // event handling
  const handleClose = () => {
    onCancel(currentConcept);
  };

  return (
    <Dialog open={conceptEditorOpen} onClose={handleClose} fullWidth maxWidth="md">
      <CotaConceptEditorForm concept={currentConcept} onClose={handleClose} {...props} />
    </Dialog>
  );
}

interface CotaConceptEditorFormProps {
  concept: COTAConcept;
  onUpdate: (concept: COTAConcept) => void;
  onClose: () => void;
  isDescriptionEditable: boolean;
}

function CotaConceptEditorForm({ concept, onUpdate, onClose, isDescriptionEditable }: CotaConceptEditorFormProps) {
  // use react hook form
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<COTAConcept>({
    defaultValues: concept,
  });

  // form handling
  const handleUpdate: SubmitHandler<COTAConcept> = (data) => {
    onUpdate(data);
  };
  const handleError: SubmitErrorHandler<COTAConcept> = (data) => console.error(data);

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
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" color="success" type="submit">
          Save
        </Button>
      </DialogActions>
    </form>
  );
}

export default CotaConceptEditor;
