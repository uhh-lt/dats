import { ErrorMessage } from "@hookform/error-message";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Dialog, DialogActions, DialogContent, MenuItem, Stack } from "@mui/material";
import { useCallback, useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import FolderHooks from "../../api/FolderHooks.ts";
import { FolderType } from "../../api/openapi/models/FolderType.ts";
import { FolderUpdate } from "../../api/openapi/models/FolderUpdate.ts";
import { useDialogMaximize } from "../../hooks/useDialogMaximize.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";
import FormMenu from "../FormInputs/FormMenu.tsx";
import FormText from "../FormInputs/FormText.tsx";
import DATSDialogHeader from "../MUI/DATSDialogHeader.tsx";
import { useWithLevel } from "../TreeExplorer/useWithLevel.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";
import FolderRenderer from "./FolderRenderer.tsx";

function FolderEditDialog() {
  const dispatch = useAppDispatch();

  // folder to edit
  const folder = useAppSelector((state) => state.dialog.folder);

  // folders for selection as parent
  const folders = FolderHooks.useGetAllFolders();
  const folderTree = useWithLevel(folders.data || []);

  // open/close dialog
  const isOpen = useAppSelector((state) => state.dialog.isFolderEditDialogOpen);
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeFolderEditDialog());
  }, [dispatch]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<FolderUpdate>();

  // reset form when dialog opens
  useEffect(() => {
    if (isOpen && folder) {
      reset({
        parent_id: folder.parent_id || -1,
        name: folder.name,
      });
    }
  }, [isOpen, reset, folder]);

  // form actions
  const { mutate: updateFolderMutation, isPending: isUpdateLoading } = FolderHooks.useUpdateFolder();
  const handleFolderUpdate = useCallback<SubmitHandler<FolderUpdate>>(
    (data) => {
      if (folder) {
        updateFolderMutation(
          {
            requestBody: {
              name: data.name,
              parent_id: data.parent_id === -1 ? null : data.parent_id,
            },
            folderId: folder.id,
          },
          {
            onSuccess: () => {
              handleClose();
            },
          },
        );
      } else {
        throw new Error("Invalid invocation of method handleFolderUpdate! Only call when folder.data is available!");
      }
    },
    [handleClose, folder, updateFolderMutation],
  );
  const { mutate: deleteFolderMutation, isPending: isDeleteLoading } = FolderHooks.useDeleteFolder();
  const handleFolderDelete = useCallback(() => {
    if (folder) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to delete the folder "${folder.name}"? This will delete ALL contained documents, their annotations, memos, etc. This action cannot be undone!`,
        onAccept: () => {
          deleteFolderMutation(
            { folderId: folder.id },
            {
              onSuccess: () => {
                handleClose();
              },
            },
          );
        },
      });
    } else {
      throw new Error("Invalid invocation of method handleDelete! Only call when folder is available!");
    }
  }, [deleteFolderMutation, handleClose, folder]);
  const handleError: SubmitErrorHandler<FolderUpdate> = (data) => console.error(data);

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMaximized}
      component="form"
      onSubmit={handleSubmit(handleFolderUpdate, handleError)}
    >
      <DATSDialogHeader
        title={`Edit folder ${folder?.name}`}
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
              label: "Parent Folder",
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
            {folderTree.map((folderWithLevel) => (
              <MenuItem
                key={folderWithLevel.data.id}
                value={folderWithLevel.data.id}
                style={{ paddingLeft: folderWithLevel.level * 10 + 16 }}
              >
                <FolderRenderer folder={folderWithLevel.data} folderType={FolderType.NORMAL} renderName />
              </MenuItem>
            ))}
          </FormMenu>
          <FormText
            name="name"
            control={control}
            rules={{
              required: "Folder name is required",
            }}
            textFieldProps={{
              label: "Folder name",
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
        </Stack>
      </DialogContent>
      <DialogActions>
        <LoadingButton
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          loading={isDeleteLoading}
          loadingPosition="start"
          onClick={handleFolderDelete}
          sx={{ flexShrink: 0 }}
        >
          Delete Folder
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
          Update Folder
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default FolderEditDialog;
