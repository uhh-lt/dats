import { ErrorMessage } from "@hookform/error-message";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Dialog, DialogActions, DialogContent, MenuItem, Stack } from "@mui/material";
import { useCallback, useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import TagHooks from "../../api/TagHooks.ts";
import { TagUpdate } from "../../api/openapi/models/TagUpdate.ts";
import { useDialogMaximize } from "../../hooks/useDialogMaximize.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import ColorUtils from "../../utils/ColorUtils.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";
import FormColorPicker from "../FormInputs/FormColorPicker.tsx";
import FormMenu from "../FormInputs/FormMenu.tsx";
import FormText from "../FormInputs/FormText.tsx";
import FormTextMultiline from "../FormInputs/FormTextMultiline.tsx";
import DATSDialogHeader from "../MUI/DATSDialogHeader.tsx";
import { useWithLevel } from "../TreeExplorer/useWithLevel.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";
import TagRenderer from "./TagRenderer.tsx";

function TagEditDialog() {
  const dispatch = useAppDispatch();

  // tag to edit
  const tag = useAppSelector((state) => state.dialog.tag);

  // tags for selection as parent
  const tags = TagHooks.useGetAllTags();
  const tagTree = useWithLevel(tags.data || []);

  // open/close dialog
  const isOpen = useAppSelector((state) => state.dialog.isTagEditDialogOpen);
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeTagEditDialog());
  }, [dispatch]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<TagUpdate>();

  // reset form when dialog opens
  useEffect(() => {
    if (isOpen && tag) {
      reset({
        parent_id: tag.parent_id || -1,
        name: tag.name,
        color: ColorUtils.rgbStringToHex(tag.color) || tag.color,
        description: tag.description,
      });
    }
  }, [isOpen, reset, tag]);

  // form actions
  const { mutate: updateTagMutation, isPending: isUpdateLoading } = TagHooks.useUpdateTag();
  const handleTagUpdate = useCallback<SubmitHandler<TagUpdate>>(
    (data) => {
      if (tag) {
        updateTagMutation(
          {
            requestBody: {
              name: data.name,
              description: data.description,
              color: data.color,
              parent_id: data.parent_id === -1 ? null : data.parent_id,
            },
            tagId: tag.id,
          },
          {
            onSuccess: () => {
              handleClose();
            },
          },
        );
      } else {
        throw new Error("Invalid invocation of method handleTagUpdate! Only call when tag.data is available!");
      }
    },
    [handleClose, tag, updateTagMutation],
  );
  const { mutate: deleteTagMutation, isPending: isDeleteLoading } = TagHooks.useDeleteTag();
  const handleTagDelete = useCallback(() => {
    if (tag) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to delete the tag "${tag.name}"? This action cannot be undone!`,
        onAccept: () => {
          deleteTagMutation(
            { tagId: tag.id },
            {
              onSuccess: () => {
                handleClose();
              },
            },
          );
        },
      });
    } else {
      throw new Error("Invalid invocation of method handleDelete! Only call when tag is available!");
    }
  }, [deleteTagMutation, handleClose, tag]);
  const handleError: SubmitErrorHandler<TagUpdate> = (data) => console.error(data);

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMaximized}
      component="form"
      onSubmit={handleSubmit(handleTagUpdate, handleError)}
    >
      <DATSDialogHeader
        title={`Edit tag ${tag?.name}`}
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <DialogContent>
        <Stack spacing={3}>
          <FormMenu
            name="parent_id"
            control={control}
            rules={{
              required: "Selection is required",
            }}
            textFieldProps={{
              label: "Parent Tag",
              error: Boolean(errors.parent_id),
              helperText: <ErrorMessage errors={errors} name="parent_id" />,
              variant: "filled",
              fullWidth: true,
              slotProps: {
                inputLabel: { shrink: true },
              },
            }}
          >
            <MenuItem key={-1} value={-1}>
              No parent
            </MenuItem>
            {tagTree.map((tagWithLevel) => (
              <MenuItem
                key={tagWithLevel.data.id}
                value={tagWithLevel.data.id}
                style={{ paddingLeft: tagWithLevel.level * 10 + 6 }}
              >
                <TagRenderer tag={tagWithLevel.data} />
              </MenuItem>
            ))}
          </FormMenu>
          <FormText
            name="name"
            control={control}
            rules={{
              required: "Tag name is required",
            }}
            textFieldProps={{
              label: "Tag name",
              variant: "standard",
              fullWidth: true,
              error: Boolean(errors.name),
              helperText: <ErrorMessage errors={errors} name="name" />,
              slotProps: {
                inputLabel: { shrink: true },
              },
              autoFocus: true,
            }}
          />
          <FormColorPicker
            name="color"
            control={control}
            rules={{
              required: "Color is required",
            }}
            textFieldProps={{
              label: "Color",
              variant: "standard",
              fullWidth: true,
              error: Boolean(errors.color),
              helperText: <ErrorMessage errors={errors} name="color" />,
              slotProps: {
                inputLabel: { shrink: true },
              },
            }}
          />
          <FormTextMultiline
            name="description"
            control={control}
            rules={{
              required: "Description is required",
            }}
            textFieldProps={{
              label: "Description",
              variant: "standard",
              fullWidth: true,
              error: Boolean(errors.description),
              helperText: <ErrorMessage errors={errors} name="description" />,
              slotProps: {
                inputLabel: { shrink: true },
              },
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <LoadingButton
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          loading={isDeleteLoading}
          loadingPosition="start"
          onClick={handleTagDelete}
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
          loading={isUpdateLoading}
          loadingPosition="start"
        >
          Update Tag
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default TagEditDialog;
