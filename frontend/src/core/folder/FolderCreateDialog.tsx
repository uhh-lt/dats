import { FolderHooks } from "@api/hooks/FolderHooks";
import { FolderCreate } from "@api/models/FolderCreate";
import { FolderType } from "@api/models/FolderType";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormMenu, FormText } from "@components/form-inputs";
import { useWithLevel } from "@components/tree-explorer";
import { ErrorMessage } from "@hookform/error-message";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Dialog, DialogActions, DialogContent, MenuItem, Stack } from "@mui/material";
import { useCloseDialog, useDialogState } from "@store/global/dialogBusSlice";
import { useCallback, useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { FolderRenderer } from "./FolderRenderer";

interface FolderCreateDialogProps {
  projectId: number;
  onFoldersCreated?: (folderIdsToExpand: number[]) => void;
}

export function FolderCreateDialog({ projectId, onFoldersCreated }: FolderCreateDialogProps) {
  const { isOpen: isFolderCreateDialogOpen, data } = useDialogState("folderCreate");
  const handleClose = useCloseDialog("folderCreate");

  // folders for selection as parent
  const folders = FolderHooks.useGetAllFolders();
  const foldersWithLevel = useWithLevel(folders.data || []);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<FolderCreate>();

  // reset form when dialog opens
  useEffect(() => {
    if (isFolderCreateDialogOpen && data?.folderName) {
      reset({
        name: data.folderName || "",
        folder_type: FolderType.NORMAL,
        parent_id: -1,
        project_id: projectId,
      });
    }
  }, [isFolderCreateDialogOpen, data, reset, projectId]);

  // form actions
  const { mutate: createFolderMutation, isPending } = FolderHooks.useCreateFolder();
  const handleFolderCreation = useCallback<SubmitHandler<FolderCreate>>(
    (data) => {
      createFolderMutation(
        {
          requestBody: {
            name: data.name,
            folder_type: FolderType.NORMAL,
            parent_id: data.parent_id === -1 ? null : data.parent_id,
            project_id: projectId,
          },
        },
        {
          onSuccess: (data) => {
            // if we add a new folder successfully, we want to show the folder in the folder explorer
            // this means, we have to expand the parent folders, so the new folder is visible
            const foldersToExpand: number[] = [];
            let parentFolderId = data.parent_id;
            while (parentFolderId) {
              const currentParentFolderId = parentFolderId;
              foldersToExpand.push(parentFolderId);
              parentFolderId = folders.data?.find((folder) => folder.id === currentParentFolderId)?.parent_id;
            }
            onFoldersCreated?.(foldersToExpand);
            handleClose();
          },
        },
      );
    },
    [createFolderMutation, handleClose, onFoldersCreated, projectId, folders.data],
  );
  const handleError: SubmitErrorHandler<FolderCreate> = (data) => console.error(data);

  return (
    <Dialog
      open={isFolderCreateDialogOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMaximized}
      component="form"
      onSubmit={handleSubmit(handleFolderCreation, handleError)}
    >
      <DATSDialogHeader
        title="Create a new folder"
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <DialogContent>
        <Stack spacing={3}>
          <FormMenu
            name="parent_id"
            rules={{
              required: "Selection is required",
            }}
            control={control}
            textFieldProps={{
              label: "Parent Folder",
              variant: "filled",
              fullWidth: true,
              error: Boolean(errors.parent_id),
              helperText: <ErrorMessage errors={errors} name="parent_id" />,
              slotProps: {
                inputLabel: { shrink: true },
              },
            }}
          >
            <MenuItem value={-1}>No parent</MenuItem>
            {foldersWithLevel.map((folderWithLevel) => (
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
            rules={{
              required: "Folder name is required",
            }}
            control={control}
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
          color="success"
          type="submit"
          startIcon={<SaveIcon />}
          fullWidth
          loading={isPending}
          loadingPosition="start"
        >
          Create Folder
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
