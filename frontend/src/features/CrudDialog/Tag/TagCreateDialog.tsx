import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  rgbToHex,
} from "@mui/material";
import { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Controller, SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import TagHooks from "../../../api/TagHooks.ts";
import { DocumentTagCreate } from "../../../api/openapi/models/DocumentTagCreate.ts";
import TagRenderer from "../../../components/DataGrid/TagRenderer.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { contrastiveColors } from "../../../views/annotation/colors.ts";
import SnackbarAPI from "../../Snackbar/SnackbarAPI.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";

/**
 * A dialog that allows to create a DocumentTag.
 * This component listens to the 'open-tag' event.
 * It opens automatically and fills the form with the provided name.
 * @constructor
 */
function TagCreateDialog() {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global state (redux)
  const tags = ProjectHooks.useGetAllTags(projectId);

  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    control,
  } = useForm<DocumentTagCreate>({
    defaultValues: {
      parent_tag_id: -1,
      title: "",
      color: "#000000",
      description: "",
      project_id: projectId,
    },
  });

  // local state
  const [color, setColor] = useState("#000000");

  // global client state (redux)
  const isTagCreateDialogOpen = useAppSelector((state) => state.dialog.isTagCreateDialogOpen);
  const tagName = useAppSelector((state) => state.dialog.tagName);
  const parentTagId = useAppSelector((state) => state.dialog.parentTagId);
  const dispatch = useAppDispatch();

  // initialize form when tag changes
  useEffect(() => {
    // reset
    const randomHexColor = rgbToHex(contrastiveColors[Math.floor(Math.random() * contrastiveColors.length)]);
    reset({
      title: tagName || "",
      color: randomHexColor,
      parent_tag_id: parentTagId ? parentTagId : -1,
    });
    setColor(randomHexColor);
  }, [parentTagId, reset, tagName]);

  // actions
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeTagCreateDialog());
  };

  // mutations
  const createTagMutation = TagHooks.useCreateTag();

  // form actions
  const handleTagCreation: SubmitHandler<DocumentTagCreate> = (data) => {
    createTagMutation.mutate(
      {
        requestBody: {
          title: data.title,
          description: data.description || "",
          color: data.color,
          parent_tag_id: data.parent_tag_id,
          project_id: projectId,
        },
      },
      {
        onSuccess: (data) => {
          SnackbarAPI.openSnackbar({
            text: `Added tag ${data.title}`,
            severity: "success",
          });

          handleClose();
        },
      },
    );
  };
  const handleError: SubmitErrorHandler<DocumentTagCreate> = (data) => console.error(data);

  return (
    <Dialog open={isTagCreateDialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleTagCreation, handleError)}>
        <DialogTitle>New tag</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <Controller
              name="parent_tag_id"
              control={control}
              rules={{
                required: "Value is required",
              }}
              render={({ field: { onBlur, onChange, value } }) => (
                <TextField
                  fullWidth
                  select
                  label="Parent Tag"
                  variant="filled"
                  onChange={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={Boolean(errors.parent_tag_id)}
                  helperText={<ErrorMessage errors={errors} name="parent_tag_id" />}
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value={-1}>No parent</MenuItem>
                  {tags.data?.map((tag) => (
                    <MenuItem key={tag.id} value={tag.id}>
                      <TagRenderer tag={tag} />
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Please enter a name for the new tag"
              autoFocus
              fullWidth
              variant="standard"
              {...register("title", { required: "Tag title is required" })}
              error={Boolean(errors?.title)}
              helperText={<ErrorMessage errors={errors} name="color" />}
              InputLabelProps={{ shrink: true }}
            />
            <Stack direction="row">
              <TextField
                label="Choose a color for the new tag"
                fullWidth
                variant="standard"
                {...register("color", { required: "Color is required" })}
                onChange={(e) => {
                  setColor(e.target.value);
                }}
                error={Boolean(errors.color)}
                helperText={<ErrorMessage errors={errors} name="color" />}
                InputLabelProps={{ shrink: true }}
              />
              <Box sx={{ width: 48, height: 48, backgroundColor: color, ml: 1, flexShrink: 0 }} />
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
              multiline
              minRows={5}
              label="Description"
              fullWidth
              variant="standard"
              {...register("description")}
              error={Boolean(errors.description)}
              helperText={<ErrorMessage errors={errors} name="description" />}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <LoadingButton
            variant="contained"
            type="submit"
            startIcon={<SaveIcon />}
            loading={createTagMutation.isPending}
            loadingPosition="start"
          >
            Create
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default TagCreateDialog;
