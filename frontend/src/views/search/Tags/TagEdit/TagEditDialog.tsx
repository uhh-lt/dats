import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../../features/snackbar/SnackbarAPI";
import { useForm } from "react-hook-form";
import eventBus from "../../../../EventBus";
import { DocumentTagRead, DocumentTagService } from "../../../../api/openapi";
import TagHooks from "../../../../api/TagHooks";
import { QueryKey } from "../../../../api/QueryKey";
import { ErrorMessage } from "@hookform/error-message";

/**
 * A dialog that allows to update a DocumentTag.
 * This component listens to the 'open-edit-tag' event.
 * It opens automatically and loads the corresponding DocumentTag.
 * @constructor
 */
function TagEditDialog() {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  // state
  const [tagId, setTagId] = useState<number | undefined>(undefined);
  const [open, setOpen] = useState(false);

  // query
  const tag = useQuery<DocumentTagRead, Error>(
    [QueryKey.TAG, tagId],
    () => DocumentTagService.getByIdDoctagTagIdGet({ tagId: tagId! }),
    {
      enabled: !!tagId,
    }
  );

  // listen to event
  // create a (memoized) function that stays the same across re-renders
  const onOpenEditTag = useCallback((event: CustomEventInit) => {
    setOpen(true);
    setTagId(event.detail);
  }, []);
  useEffect(() => {
    eventBus.on("open-edit-tag", onOpenEditTag);
    return () => {
      eventBus.remove("open-edit-tag", onOpenEditTag);
    };
  }, [onOpenEditTag]);

  // initialize form when tag changes
  useEffect(() => {
    if (tag.data) {
      reset({
        title: tag.data.title,
        description: tag.data.description,
      });
    }
  }, [tag.data, reset]);

  // mutations
  const queryClient = useQueryClient();
  const updateTagMutation = TagHooks.useUpdateTag({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.TAG, data.id]);
      setOpen(false); // close dialog
      SnackbarAPI.openSnackbar({
        text: `Updated tag with id ${data.id}`,
        severity: "success",
      });
    },
  });

  // form handling
  const handleTagUpdate = (data: any) => {
    if (tag.data) {
      updateTagMutation.mutate({
        requestBody: {
          title: data.title,
          description: data.description,
        },
        tagId: tag.data.id,
      });
    } else {
      throw new Error("Invalid invocation of method handleTagUpdate! Only call when tag.data is available!");
    }
  };
  const handleError = (data: any) => console.error(data);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleTagUpdate, handleError)}>
        {tag.isLoading && <DialogTitle>Loading tag...</DialogTitle>}
        {tag.isError && <DialogTitle>Error: {tag.error.message}</DialogTitle>}
        {tag.isSuccess && <DialogTitle>Edit tag {tag.data.title}</DialogTitle>}
        <DialogContent>
          <Stack spacing={3}>
            <TextField
              label="Name"
              fullWidth
              variant="standard"
              {...register("title", { required: "Tag title is required" })}
              error={Boolean(errors?.title)}
              helperText={<>{errors?.title ? errors.title.message : ""}</>}
              disabled={!tag.isSuccess}
            />
            <TextField
              multiline
              minRows={5}
              label="Description"
              fullWidth
              variant="standard"
              {...register("description", { required: "Description is required" })}
              error={Boolean(errors.description)}
              helperText={<ErrorMessage errors={errors} name="description" />}
              disabled={!tag.isSuccess}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="success"
            fullWidth
            type="submit"
            disabled={updateTagMutation.isLoading || !tag.isSuccess}
          >
            {updateTagMutation.isLoading ? "Updating tag..." : "Update Tag"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default TagEditDialog;
