import { TagHooks } from "@api/hooks/TagHooks";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormColorPicker, FormMenu, FormText, FormTextMultiline } from "@components/form-inputs";
import { useWithLevel } from "@components/tree-explorer";
import { useOpenConfirmationDialog } from "@core/notification";
import { ErrorMessage } from "@hookform/error-message";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { TagUpdate } from "@models/TagUpdate";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { Button, Dialog, DialogActions, DialogContent, MenuItem, Stack } from "@mui/material";
import { useDialog } from "@store/global/dialogBusSlice";
import { ColorUtils } from "@utils/colors/ColorUtils";
import { useCallback, useEffect, useMemo } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { TagRenderer } from "../TagRenderer";

export function TagEditDialog() {
  const { isOpen, data: dialogData, close: handleClose } = useDialog("tagEdit");

  // tags for selection as parent
  const tags = TagHooks.useGetAllTags();
  const parentTags = useMemo(() => {
    if (!tags.data || !dialogData?.tag) return [];

    return tags.data.filter((tag) => tag.id !== dialogData.tag.id);
  }, [dialogData, tags.data]);
  const tagTree = useWithLevel(parentTags);

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
    if (isOpen && dialogData?.tag) {
      reset({
        parent_id: dialogData.tag.parent_id || -1,
        name: dialogData.tag.name,
        color: ColorUtils.rgbStringToHex(dialogData.tag.color) || dialogData.tag.color,
        description: dialogData.tag.description,
      });
    }
  }, [isOpen, reset, dialogData]);

  // form actions
  const { mutate: updateTagMutation, isPending: isUpdateLoading } = TagHooks.useUpdateTag();
  const handleTagUpdate = useCallback<SubmitHandler<TagUpdate>>(
    (updateData) => {
      if (dialogData?.tag) {
        updateTagMutation(
          {
            requestBody: {
              name: updateData.name,
              description: updateData.description,
              color: updateData.color,
              parent_id: updateData.parent_id === -1 ? null : updateData.parent_id,
            },
            tagId: dialogData.tag.id,
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
    [handleClose, dialogData, updateTagMutation],
  );
  const openConfirmationDialog = useOpenConfirmationDialog();
  const { mutate: deleteTagMutation, isPending: isDeleteLoading } = TagHooks.useDeleteTag();
  const handleTagDelete = useCallback(() => {
    if (dialogData?.tag) {
      openConfirmationDialog({
        type: "DELETE",
        text: `Do you really want to delete the tag "${dialogData.tag.name}"? This action cannot be undone!`,
        onAccept: () => {
          deleteTagMutation(
            { tagId: dialogData.tag.id },
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
  }, [dialogData, openConfirmationDialog, deleteTagMutation, handleClose]);
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
        title={`Edit tag ${dialogData?.tag?.name}`}
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
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          loading={isDeleteLoading}
          loadingPosition="start"
          onClick={handleTagDelete}
          sx={{ flexShrink: 0 }}
        >
          Delete Tag
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          fullWidth
          type="submit"
          loading={isUpdateLoading}
          loadingPosition="start"
        >
          Update Tag
        </Button>
      </DialogActions>
    </Dialog>
  );
}
