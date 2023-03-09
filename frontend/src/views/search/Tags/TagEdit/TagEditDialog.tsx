import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import SnackbarAPI from "../../../../features/Snackbar/SnackbarAPI";
import { useForm } from "react-hook-form";
import eventBus from "../../../../EventBus";
import TagHooks from "../../../../api/TagHooks";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import { HexColorPicker } from "react-colorful";
import ColorUtils from "../../../../utils/ColorUtils";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";

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
    setValue,
  } = useForm();

  // state
  const [tagId, setTagId] = useState<number>();
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState("#000000");

  // query
  const tag = TagHooks.useGetTag(tagId);

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
      const c = ColorUtils.rgbStringToHex(tag.data.color) || tag.data.color;
      reset({
        title: tag.data.title,
        description: tag.data.description,
        color: tag.data.color,
      });
      setColor(c);
    }
  }, [tag.data, reset]);

  // mutations
  const updateTagMutation = TagHooks.useUpdateTag();
  const deleteTagMutation = TagHooks.useDeleteTag();

  // form handling
  const handleTagUpdate = (data: any) => {
    if (tag.data) {
      updateTagMutation.mutate(
        {
          requestBody: {
            title: data.title,
            description: data.description,
            color: data.color,
          },
          tagId: tag.data.id,
        },
        {
          onSuccess: (data) => {
            setOpen(false); // close dialog
            SnackbarAPI.openSnackbar({
              text: `Updated tag with id ${data.id}`,
              severity: "success",
            });
          },
        }
      );
    } else {
      throw new Error("Invalid invocation of method handleTagUpdate! Only call when tag.data is available!");
    }
  };
  const handleError = (data: any) => console.error(data);
  const handleDelete = () => {
    if (tag.data) {
      deleteTagMutation.mutate(
        { tagId: tag.data.id },
        {
          onSuccess: (data) => {
            setOpen(false); // close dialog
            SnackbarAPI.openSnackbar({
              text: `Deleted tag with id ${data.id}`,
              severity: "success",
            });
          },
        }
      );
    } else {
      throw new Error("Invalid invocation of method handleDelete! Only call when tag.data is available!");
    }
  };

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
            <Stack direction="row">
              <TextField
                label="Color"
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
              {...register("description", { required: "Description is required" })}
              error={Boolean(errors.description)}
              helperText={<ErrorMessage errors={errors} name="description" />}
              disabled={!tag.isSuccess}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <LoadingButton
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={!tag.isSuccess}
            loading={deleteTagMutation.isLoading}
            loadingPosition="start"
            onClick={handleDelete}
            sx={{ flexShrink: 0 }}
          >
            Delete Tag
          </LoadingButton>
          <LoadingButton
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
            fullWidth
            type="submit"
            disabled={!tag.isSuccess}
            loading={updateTagMutation.isLoading}
            loadingPosition="start"
          >
            Update Tag
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default TagEditDialog;
