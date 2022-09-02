import React, { useCallback, useEffect, useState } from "react";
import eventBus from "../../../../EventBus";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../../features/snackbar/SnackbarAPI";
import { useParams } from "react-router-dom";
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
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
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
        title: data.name,
        description: "1234",
        project_id: projectId,
      },
    });
  };
  const handleError = (data: any) => console.error(data);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleTagCreation, handleError)}>
        <DialogTitle>Neues Label</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Geben Sie einen neuen Labelnamen ein:"
            fullWidth
            variant="standard"
            {...register("name", { required: "Tag name is required" })}
            error={Boolean(errors.name)}
            helperText={<ErrorMessage errors={errors} name="name" />}
          />
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
