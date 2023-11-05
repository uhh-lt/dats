import React, { useCallback, useEffect, useState } from "react";
import eventBus from "../../../EventBus";
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
import { SubmitHandler, useForm } from "react-hook-form";
import SnackbarAPI from "../../Snackbar/SnackbarAPI";
import { useParams } from "react-router-dom";
import { HexColorPicker } from "react-colorful";
import TagHooks from "../../../api/TagHooks";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import SaveIcon from "@mui/icons-material/Save";
import { DocumentTagCreate } from "../../../api/openapi";
import { contrastiveColors } from "../../../views/annotation/colors";
import ProjectHooks from "../../../api/ProjectHooks";
import TagRenderer from "../../../components/DataGrid/TagRenderer";

type TagCreateDialogPayload = {
  tagName?: string;
  parentTagId?: number;
};

export const openTagCreateDialog = (payload: TagCreateDialogPayload) => {
  eventBus.dispatch("open-create-tag", payload);
};

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
    getValues,
  } = useForm<DocumentTagCreate>({
    defaultValues: {
      parent_tag_id: -1,
      title: "",
      color: "#000000",
      description: "",
      project_id: projectId,
    },
  });

  // state
  const [isTagCreateDialogOpen, setIsTagCreateDialogOpen] = useState(false);
  const [color, setColor] = useState("#000000");

  // create a (memoized) function that stays the same across re-renders
  const onOpenCreateTag = useCallback(
    (data: CustomEventInit<TagCreateDialogPayload>) => {
      if (!data.detail) return;

      // reset
      const randomHexColor = rgbToHex(contrastiveColors[Math.floor(Math.random() * contrastiveColors.length)]);
      reset({
        title: data.detail.tagName ? data.detail.tagName : "",
        color: randomHexColor,
        parent_tag_id: data.detail.parentTagId ? data.detail.parentTagId : -1,
      });
      setColor(randomHexColor);
      setIsTagCreateDialogOpen(true);
    },
    [reset],
  );

  useEffect(() => {
    eventBus.on("open-create-tag", onOpenCreateTag);
    return () => {
      eventBus.remove("open-create-tag", onOpenCreateTag);
    };
  }, [onOpenCreateTag]);

  // actions
  const handleClose = () => {
    setIsTagCreateDialogOpen(false);
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

          setIsTagCreateDialogOpen(false); // close dialog
        },
      },
    );
  };
  const handleError = (data: any) => console.error(data);

  return (
    <Dialog open={isTagCreateDialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleTagCreation, handleError)}>
        <DialogTitle>New tag</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <TextField
              fullWidth
              select
              label="Parent Tag"
              variant="filled"
              defaultValue={getValues("parent_tag_id")}
              {...register("parent_tag_id")}
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
            loading={createTagMutation.isLoading}
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
