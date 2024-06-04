import { ErrorMessage } from "@hookform/error-message";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import React, { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import TagHooks from "../../api/TagHooks.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { DocumentTagUpdate } from "../../api/openapi/models/DocumentTagUpdate.ts";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import ColorUtils from "../../utils/ColorUtils.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";
import TagRenderer from "./TagRenderer.tsx";

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
  const [color, setColor] = useState("#000000");

  // global client state (redux)
  const tagId = useAppSelector((state) => state.dialog.tagId);
  const open = useAppSelector((state) => state.dialog.isTagEditDialogOpen);
  const dispatch = useAppDispatch();

  // query
  const tag = TagHooks.useGetTag(tagId);

  // initialize form when tag changes
  useEffect(() => {
    if (tag.data) {
      const c = ColorUtils.rgbStringToHex(tag.data.color) || tag.data.color;
      reset({
        name: tag.data.name,
        description: tag.data.description,
        color: tag.data.color,
        parent_id: tag.data.parent_id || -1,
      });
      setColor(c);
    }
  }, [tag.data, reset]);

  // mutations
  const updateTagMutation = TagHooks.useUpdateTag();
  const deleteTagMutation = TagHooks.useDeleteTag();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // form handling
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeTagEditDialog());
  };
  const handleTagUpdate: SubmitHandler<DocumentTagUpdate> = (data) => {
    if (tag.data) {
      updateTagMutation.mutate(
        {
          requestBody: {
            name: data.name,
            description: data.description,
            color: data.color,
            parent_id: data.parent_id,
          },
          tagId: tag.data.id,
        },
        {
          onSuccess: (data) => {
            handleClose();
            openSnackbar({
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
        text: `Do you really want to delete the tag "${tag.data.name}"? This action cannot be undone!`,
        onAccept: () => {
          deleteTagMutation.mutate(
            { tagId: tag.data.id },
            {
              onSuccess: (data) => {
                handleClose();
                openSnackbar({
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

  const menuItems: React.ReactNode[] = tags
    .filter((t) => t.id !== tag.data?.id)
    .map((t) => (
      <MenuItem key={t.id} value={t.id}>
        <TagRenderer tag={t} />
      </MenuItem>
    ));

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleTagUpdate, handleError)}>
        {tag.isLoading && <DialogTitle>Loading tag...</DialogTitle>}
        {tag.isError && <DialogTitle>Error: {tag.error.message}</DialogTitle>}
        {tag.isSuccess && <DialogTitle>Edit tag {tag.data.name}</DialogTitle>}
        <DialogContent>
          <Stack spacing={3}>
            <TextField
              key={tag.data?.id}
              fullWidth
              select
              label="Parent Code"
              variant="filled"
              defaultValue={tag.data?.parent_id || -1}
              {...register("parent_id")}
              error={Boolean(errors.parent_id)}
              helperText={<ErrorMessage errors={errors} name="parent_id" />}
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
              {...register("name", { required: "Tag name is required" })}
              error={Boolean(errors?.name)}
              helperText={<>{errors?.name ? errors.name.message : ""}</>}
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
            loading={deleteTagMutation.isPending}
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
            loading={updateTagMutation.isPending}
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
