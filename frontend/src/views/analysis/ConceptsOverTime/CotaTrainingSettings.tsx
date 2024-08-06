import { ErrorMessage } from "@hookform/error-message";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack } from "@mui/material";
import { useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { COTATrainingSettings } from "../../../api/openapi/models/COTATrainingSettings.ts";
import { DimensionalityReductionAlgorithm } from "../../../api/openapi/models/DimensionalityReductionAlgorithm.ts";
import FormMenu from "../../../components/FormInputs/FormMenu.tsx";
import FormNumber from "../../../components/FormInputs/FormNumber.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";

interface CotaTrainingSettingsProps {
  onUpdate: (trainingSettings: COTATrainingSettings) => void;
  onCancel: () => void;
}

function CotaTrainingSettings({ onUpdate, onCancel }: CotaTrainingSettingsProps) {
  // use react hook form
  const {
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<COTATrainingSettings>();

  // global server state (react-query)
  const trainingSettings = useAppSelector((state) => state.cota.trainingSettings);
  const trainingSettingsOpen = useAppSelector((state) => state.cota.trainingSettingsOpen);

  // reset the form when the settings changes
  useEffect(() => {
    reset({
      ...trainingSettings,
    });
  }, [trainingSettings, reset]);

  // event handling
  const handleClose = () => {
    onCancel();
  };

  // form handling
  const handleUpdate: SubmitHandler<COTATrainingSettings> = (data) => {
    onUpdate(data);
  };
  const handleError: SubmitErrorHandler<COTATrainingSettings> = (data) => console.error(data);

  return (
    <Dialog open={trainingSettingsOpen} onClose={handleClose} fullWidth maxWidth="md">
      <form onSubmit={handleSubmit(handleUpdate, handleError)}>
        <DialogTitle>Advanced Training Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Divider>Search Space</Divider>
            <FormNumber
              name="search_space_topk"
              control={control}
              rules={{
                required: "Search Space Top K is required",
              }}
              textFieldProps={{
                label: "Search Space Top K",
                variant: "outlined",
                fullWidth: true,
                error: Boolean(errors.search_space_topk),
                helperText: <ErrorMessage errors={errors} name="search_space_topk" />,
                InputLabelProps: { shrink: true },
                inputProps: {
                  min: 10,
                  max: 10000,
                  step: 1,
                },
              }}
            />
            <FormNumber
              name="search_space_threshold"
              control={control}
              rules={{
                required: "Search Space Threshold is required",
              }}
              textFieldProps={{
                label: "Search Space Threshold",
                variant: "outlined",
                fullWidth: true,
                error: Boolean(errors.search_space_threshold),
                helperText: <ErrorMessage errors={errors} name="search_space_threshold" />,
                InputLabelProps: { shrink: true },
                inputProps: {
                  min: 0.01,
                  max: 1,
                  step: 0.01,
                },
              }}
            />

            <Divider>Context Embedding Model</Divider>

            <FormNumber
              name="layers"
              control={control}
              rules={{
                required: "Num. feed forward layers is required",
              }}
              textFieldProps={{
                label: "Num. feed forward layers",
                variant: "outlined",
                fullWidth: true,
                error: Boolean(errors.layers),
                helperText: <ErrorMessage errors={errors} name="layers" />,
                InputLabelProps: { shrink: true },
                inputProps: {
                  min: 1,
                  max: 10000,
                  step: 1,
                },
              }}
            />

            <FormNumber
              name="dimensions"
              control={control}
              rules={{
                required: "Dimensions of feed forward layers is required",
              }}
              textFieldProps={{
                label: "Dimensions of feed forward layers",
                variant: "outlined",
                fullWidth: true,
                error: Boolean(errors.dimensions),
                helperText: <ErrorMessage errors={errors} name="dimensions" />,
                InputLabelProps: { shrink: true },
                inputProps: {
                  min: 1,
                  max: 10000,
                  step: 1,
                },
              }}
            />

            <Divider>Training</Divider>

            <FormNumber
              name="epochs"
              control={control}
              rules={{
                required: "Epochs is required",
              }}
              textFieldProps={{
                label: "Epochs",
                variant: "outlined",
                fullWidth: true,
                error: Boolean(errors.epochs),
                helperText: <ErrorMessage errors={errors} name="epochs" />,
                InputLabelProps: { shrink: true },
                inputProps: {
                  min: 1,
                  max: 100,
                  step: 1,
                },
              }}
            />

            <FormNumber
              name="min_required_annotations_per_concept"
              control={control}
              rules={{
                required: "Min. required annotations per concept is required",
              }}
              textFieldProps={{
                label: "Min. required annotations per concept",
                variant: "outlined",
                fullWidth: true,
                error: Boolean(errors.min_required_annotations_per_concept),
                helperText: <ErrorMessage errors={errors} name="min_required_annotations_per_concept" />,
                InputLabelProps: { shrink: true },
                inputProps: {
                  min: 1,
                  max: 10000,
                  step: 1,
                },
              }}
            />

            <Divider>Other</Divider>

            <FormMenu
              name="dimensionality_reduction_algorithm"
              control={control}
              textFieldProps={{
                label: "Dimensionality Reduction Algorithm",
                error: Boolean(errors.dimensionality_reduction_algorithm),
                helperText: <ErrorMessage errors={errors} name="dimensionality_reduction_algorithm" />,
                variant: "outlined",
                fullWidth: true,
                InputLabelProps: { shrink: true },
              }}
            >
              {Object.values(DimensionalityReductionAlgorithm).map((value) => (
                <MenuItem key={value} value={value}>
                  {value.toLocaleUpperCase()}
                </MenuItem>
              ))}
            </FormMenu>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button variant="contained" color="success" type="submit">
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default CotaTrainingSettings;
