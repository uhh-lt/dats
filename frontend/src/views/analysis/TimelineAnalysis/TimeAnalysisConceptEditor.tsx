import { ErrorMessage } from "@hookform/error-message";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import ColorUtils from "../../../utils/ColorUtils";
import { AnalysisActions, TimelineAnalysisConcept } from "../analysisSlice";

function TimelineAnalysisConceptEditor() {
  // local state
  const [color, setColor] = useState("#000000");

  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<TimelineAnalysisConcept>();

  // redux
  const currentConcept = useAppSelector((state) => state.analysis.currentConcept);
  const conceptEditorOpen = useAppSelector((state) => state.analysis.conceptEditorOpen);
  const dispatch = useAppDispatch();

  // reset the form when the current concept changes
  useEffect(() => {
    const c = ColorUtils.rgbStringToHex(currentConcept.color) || currentConcept.color;
    reset({
      ...currentConcept,
      color: c,
    });
    setColor(c);
  }, [currentConcept, reset, setValue]);

  // event handling
  const handleClose = () => dispatch(AnalysisActions.setConceptEditorOpen(false));

  // form handling
  const handleAddOrUpdate: SubmitHandler<TimelineAnalysisConcept> = (data) => {
    dispatch(AnalysisActions.addOrUpdateConcept(data));
    dispatch(AnalysisActions.setConceptEditorOpen(false));
    dispatch(AnalysisActions.resetCurrentConcept());
  };
  const handleError: SubmitErrorHandler<TimelineAnalysisConcept> = (data) => console.error(data);

  useEffect(() => {
    register("data", { required: "Data is required", validate: (v) => v.length > 0 });
    register("type", { required: "Type is required" });
  });

  return (
    <Dialog open={conceptEditorOpen} onClose={handleClose} fullWidth maxWidth="md">
      <form onSubmit={handleSubmit(handleAddOrUpdate, handleError)}>
        <DialogTitle>Add / edit concept</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              variant="outlined"
              key={`${currentConcept.name}-name`}
              {...register("name", { required: "Name is required" })}
              error={Boolean(errors.name)}
              helperText={<ErrorMessage errors={errors} name="name" />}
              InputLabelProps={{ shrink: true }}
            />
            <Stack direction="row">
              <TextField
                label="Color"
                fullWidth
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
                key={`${currentConcept.name}-color`}
                {...register("color", { required: "Color is required" })}
                onChange={(e) => setColor(e.target.value)}
                error={Boolean(errors.color)}
                helperText={<ErrorMessage errors={errors} name="color" />}
                InputLabelProps={{ shrink: true }}
              />
              <Box sx={{ width: 55, height: 55, backgroundColor: color, ml: 1, flexShrink: 0 }} />
            </Stack>
            <HexColorPicker
              style={{ width: "100%" }}
              color={color}
              onChange={(newColor) => {
                setValue("color", newColor); // set value of text input
                setColor(newColor); // set value of color picker (and box)
              }}
            />
            <TextField
              fullWidth
              select
              label="Type"
              variant="outlined"
              key={`${currentConcept.name}-type`}
              defaultValue={currentConcept.type}
              onChange={(event) => {
                setValue("type", event.target.value as "sentence" | "wordlist" | "code");
              }}
              error={Boolean(errors.type)}
              helperText={<ErrorMessage errors={errors} name="type" />}
              InputLabelProps={{ shrink: true }}
              disabled
            >
              <MenuItem value={"sentence"}>Sentence</MenuItem>
              <MenuItem value={"wordlist"}>Word List</MenuItem>
              <MenuItem value={"code"}>Code</MenuItem>
            </TextField>
            <Autocomplete
              multiple
              freeSolo
              options={currentConcept.data}
              key={`${currentConcept.name}-data`}
              defaultValue={currentConcept.data}
              onChange={(event, value) => {
                setValue("data", value);
              }}
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Sentences"
                  placeholder="This is an example sentence that describes the concept."
                  error={Boolean(errors.data)}
                  helperText={<ErrorMessage errors={errors} name="data" />}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />
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

export default TimelineAnalysisConceptEditor;
