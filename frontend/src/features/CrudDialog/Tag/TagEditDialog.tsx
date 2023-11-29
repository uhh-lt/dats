import { Box, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import SnackbarAPI from "../../Snackbar/SnackbarAPI";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import eventBus from "../../../EventBus";
import TagHooks from "../../../api/TagHooks";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import { HexColorPicker } from "react-colorful";
import ColorUtils from "../../../utils/ColorUtils";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import ConfirmationAPI from "../../ConfirmationDialog/ConfirmationAPI";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead";
import TagRenderer from "../../../components/DataGrid/TagRenderer";
import { DocumentTagUpdate } from "../../../api/openapi";

export const openTagEditDialog = (tagId: number) => {
  eventBus.dispatch("open-edit-tag", tagId);
};

interface TagEditDialogProps {
  tags: DocumentTagRead[];
}

/**
 * A dialog that allows to update a DocumentTag.
 * This component listens to the 'open-edit-tag' event.
 * It opens automatically and loads the corresponding DocumentTag.
 * @constructor
 */
function TagEditDialog({ tags }: TagEditDialogProps) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<DocumentTagUpdate>();

  // local state
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
        parent_tag_id: tag.data.parent_tag_id || -1,
      });
      setColor(c);
    }
  }, [tag.data, reset]);

  // mutations
  const updateTagMutation = TagHooks.useUpdateTag();
  const deleteTagMutation = TagHooks.useDeleteTag();

  // form handling
  const handleTagUpdate: SubmitHandler<DocumentTagUpdate> = (data) => {
    if (tag.data) {
      updateTagMutation.mutate(
        {
          requestBody: {
            title: data.title,
            description: data.description,
            color: data.color,
            parent_tag_id: data.parent_tag_id,
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
        },
      );
    } else {
      throw new Error("Invalid invocation of method handleTagUpdate! Only call when tag.data is available!");
    }
  };
  const handleError: SubmitErrorHandler<DocumentTagUpdate> = (data) => console.error(data);
  const handleDelete = () => {
    if (tag.data) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to delete the tag - ${tag.data.title}? This action cannot be undone!`,
        onAccept: () => {
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
            },
          );
        },
      });
    } else {
      throw new Error("Invalid invocation of method handleDelete! Only call when tag.data is available!");
    }
  };

  let menuItems: React.ReactNode[] = tags
    .filter((t) => t.id !== tag.data?.id)
    .map((t) => (
      <MenuItem key={t.id} value={t.id}>
        <TagRenderer tag={t} />
      </MenuItem>
    ));

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleTagUpdate, handleError)}>
        {tag.isLoading && <DialogTitle>Loading tag...</DialogTitle>}
        {tag.isError && <DialogTitle>Error: {tag.error.message}</DialogTitle>}
        {tag.isSuccess && <DialogTitle>Edit tag {tag.data.title}</DialogTitle>}
        <DialogContent>
          <Stack spacing={3}>
            <TextField
              key={tag.data?.id}
              fullWidth
              select
              label="Parent Code"
              variant="filled"
              defaultValue={tag.data?.parent_tag_id || -1}
              {...register("parent_tag_id")}
              error={Boolean(errors.parent_tag_id)}
              helperText={<ErrorMessage errors={errors} name="parent_tag_id" />}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem key={-1} value={-1}>
                No parent
              </MenuItem>
              {menuItems}
            </TextField>
            <TextField
              label="Name"
              fullWidth
              variant="standard"
              {...register("title", { required: "Tag title is required" })}
              error={Boolean(errors?.title)}
              helperText={<>{errors?.title ? errors.title.message : ""}</>}
              disabled={!tag.isSuccess}
              InputLabelProps={{ shrink: true }}
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
              InputLabelProps={{ shrink: true }}
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
