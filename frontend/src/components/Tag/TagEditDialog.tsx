import { ErrorMessage } from "@hookform/error-message";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack } from "@mui/material";
import React from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import TagHooks from "../../api/TagHooks.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { DocumentTagUpdate } from "../../api/openapi/models/DocumentTagUpdate.ts";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import ColorUtils from "../../utils/ColorUtils.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";
import FormColorPicker from "../FormInputs/FormColorPicker.tsx";
import FormMenu from "../FormInputs/FormMenu.tsx";
import FormText from "../FormInputs/FormText.tsx";
import FormTextMultiline from "../FormInputs/FormTextMultiline.tsx";
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
  // global client state (redux)
  const tagId = useAppSelector((state) => state.dialog.tagId);
  const open = useAppSelector((state) => state.dialog.isTagEditDialogOpen);
  const dispatch = useAppDispatch();

  // query
  const tag = TagHooks.useGetTag(tagId);

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

  return (
    <>
      {tag.data && (
        <TagEditDialogContent
          key={tag.data.id}
          tag={tag.data}
          tags={tags}
          isOpen={open}
          handleClose={handleClose}
          handleTagUpdate={handleTagUpdate}
          isUpdateLoading={updateTagMutation.isPending}
          handleTagDelete={handleDelete}
          isDeleteLoading={deleteTagMutation.isPending}
          handleError={handleError}
        />
      )}
    </>
  );
}

interface TagEditDialogContentProps {
  isOpen: boolean;
  handleClose: () => void;
  handleTagUpdate: SubmitHandler<DocumentTagUpdate>;
  isUpdateLoading: boolean;
  handleTagDelete: () => void;
  isDeleteLoading: boolean;
  handleError: SubmitErrorHandler<DocumentTagUpdate>;
  tag: DocumentTagRead;
  tags: DocumentTagRead[];
}

function TagEditDialogContent({
  tag,
  tags,
  isOpen,
  handleClose,
  handleTagUpdate,
  isUpdateLoading,
  handleTagDelete,
  isDeleteLoading,
  handleError,
}: TagEditDialogContentProps) {
  // use react hook form
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<DocumentTagUpdate>({
    defaultValues: {
      parent_id: tag.parent_id || -1,
      name: tag.name,
      color: ColorUtils.rgbStringToHex(tag.color) || tag.color,
      description: tag.description,
    },
  });

  const menuItems: React.ReactNode[] = tags
    .filter((t) => t.id !== tag.id)
    .map((t) => (
      <MenuItem key={t.id} value={t.id}>
        <TagRenderer tag={t} />
      </MenuItem>
    ));

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleTagUpdate, handleError)}>
        <DialogTitle>Edit tag {tag.name}</DialogTitle>
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
                InputLabelProps: { shrink: true },
              }}
            >
              <MenuItem key={-1} value={-1}>
                No parent
              </MenuItem>
              {menuItems}
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
                InputLabelProps: { shrink: true },
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
                InputLabelProps: { shrink: true },
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
                InputLabelProps: { shrink: true },
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
      </form>
    </Dialog>
  );
}

export default TagEditDialog;
