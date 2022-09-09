import React, { useCallback, useEffect, useState } from "react";
import eventBus from "../../../../EventBus";
import { Button, Dialog, DialogActions, DialogContent, Box, Stack, DialogTitle, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../../features/snackbar/SnackbarAPI";
import { useParams } from "react-router-dom";
import { HexColorPicker } from "react-colorful";
import TagHooks from "../../../../api/TagHooks";
import { QueryKey } from "../../../../api/QueryKey";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import SaveIcon from "@mui/icons-material/Save";

/**
 * A dialog that allows to create a DocumentTag.
 * This component listens to the 'open-tag' event.
 * It opens automatically and fills the form with the provided name.
 * @constructor
 */
function TagCreationDialog() {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();

  // state
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState("#000000");

  // create a (memoized) function that stays the same across re-renders
  const openModal = useCallback(
    (data: CustomEventInit) => {
      setOpen(true);
      setValue("name", data.detail.tagName);
    },
    [setValue]
  );

  useEffect(() => {
    eventBus.on("open-tag", openModal);
    return () => {
      eventBus.remove("open-tag", openModal);
    };
  }, [openModal]);

  // actions
  const handleClose = () => {
    setOpen(false);
  };

  // mutations
  const queryClient = useQueryClient();
  const createTagMutation = TagHooks.useCreateTag({
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_TAGS, projectId]);
      setOpen(false); // close dialog
      SnackbarAPI.openSnackbar({
        text: `Added tag ${data.title}`,
        severity: "success",
      });
      reset(); // reset form
    },
  });

  // form actions
  const handleTagCreation = (data: any) => {
    createTagMutation.mutate({
      requestBody: {
        title: data.title,
        description: data.description || "",
        color: data.color,
        project_id: projectId,
      },
    });
  };
  const handleError = (data: any) => console.error(data);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleTagCreation, handleError)}>
        <DialogTitle>New tag</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <TextField
              label="Please enter a name for the new tag"
              autoFocus
              fullWidth
              variant="standard"
              {...register("title", { required: "Tag title is required" })}
              error={Boolean(errors?.title)}
              helperText={<ErrorMessage errors={errors} name="color" />}
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

export default TagCreationDialog;
