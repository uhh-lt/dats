import { FolderHooks } from "@api/hooks/FolderHooks";
import { FolderType } from "@api/models/FolderType";
import { FolderUpdate } from "@api/models/FolderUpdate";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormMenu, FormText } from "@components/form-inputs";
import { useWithLevel } from "@components/tree-explorer";
import { useOpenConfirmationDialog } from "@core/notification";
import { ErrorMessage } from "@hookform/error-message";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { Button, Dialog, DialogActions, DialogContent, MenuItem, Stack } from "@mui/material";
import { useDialog } from "@store/global/dialogBusSlice";
import { useCallback, useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { FolderRenderer } from "./FolderRenderer";

export function FolderEditDialog() {
  const { isOpen, data: dialogData, close: handleClose } = useDialog("folderEdit");

  // folders for selection as parent
  const folders = FolderHooks.useGetAllFolders();
  const folderTree = useWithLevel(folders.data || []);

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
    if (isOpen && dialogData?.folder) {
      reset({
        parent_id: dialogData.folder.parent_id || -1,
        name: dialogData.folder.name,
      });
    }
  }, [isOpen, reset, dialogData]);

  // form actions
  const { mutate: updateFolderMutation, isPending: isUpdateLoading } = FolderHooks.useUpdateFolder();
  const handleFolderUpdate = useCallback<SubmitHandler<FolderUpdate>>(
    (updateData) => {
      if (dialogData?.folder) {
        updateFolderMutation(
          {
            requestBody: {
              name: updateData.name,
              parent_id: updateData.parent_id === -1 ? null : updateData.parent_id,
            },
            folderId: dialogData.folder.id,
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
    [handleClose, dialogData, updateFolderMutation],
  );
  const { mutate: deleteFolderMutation, isPending: isDeleteLoading } = FolderHooks.useDeleteFolder();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleFolderDelete = useCallback(() => {
    if (dialogData?.folder) {
      openConfirmationDialog({
        type: "DELETE",
        text: `Do you really want to delete the folder "${dialogData.folder.name}"? This will delete ALL contained documents, their annotations, memos, etc. This action cannot be undone!`,
        onAccept: () => {
          deleteFolderMutation(
            { folderId: dialogData.folder.id },
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
  }, [dialogData, openConfirmationDialog, deleteFolderMutation, handleClose]);
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
        title={`Edit folder ${dialogData?.folder.name}`}
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
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          loading={isDeleteLoading}
          loadingPosition="start"
          onClick={handleFolderDelete}
          sx={{ flexShrink: 0 }}
        >
          Delete Folder
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
          Update Folder
        </Button>
      </DialogActions>
    </Dialog>
  );
}
