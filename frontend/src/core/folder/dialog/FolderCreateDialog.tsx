import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Dialog, DialogActions, DialogContent, MenuItem, Stack } from "@mui/material";
import { useCallback, useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { FolderHooks } from "../../../api/FolderHooks.ts";
import { FolderCreate } from "../../../api/openapi/models/FolderCreate.ts";
import { FolderType } from "../../../api/openapi/models/FolderType.ts";
import { FormMenu } from "../../../components/FormInputs/FormMenu.tsx";
import { FormText } from "../../../components/FormInputs/FormText.tsx";
import { DATSDialogHeader } from "../../../components/MUI/DATSDialogHeader.tsx";
import { useWithLevel } from "../../../components/TreeExplorer/useWithLevel.ts";
import { SearchActions } from "../../../features/search/DocumentSearch/searchSlice.ts";
import { useDialogMaximize } from "../../../hooks/useDialogMaximize.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../store/dialogSlice.ts";
import { FolderRenderer } from "../renderer/FolderRenderer.tsx";

export function FolderCreateDialog({ projectId }: { projectId: number }) {
  const dispatch = useAppDispatch();

  // folders for selection as parent
  const folders = FolderHooks.useGetAllFolders();
  const foldersWithLevel = useWithLevel(folders.data || []);

  // open/close dialog
  const isFolderCreateDialogOpen = useAppSelector((state) => state.dialog.isFolderCreateDialogOpen);
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeFolderCreateDialog());
  }, [dispatch]);

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
  const folderName = useAppSelector((state) => state.dialog.folderName);
  useEffect(() => {
    if (isFolderCreateDialogOpen) {
      reset({
        name: folderName || "",
        folder_type: FolderType.NORMAL,
        parent_id: -1,
        project_id: projectId,
      });
    }
  }, [isFolderCreateDialogOpen, reset, folderName, projectId]);

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
            const foldersToExpand = [];
            let parentFolderId = data.parent_id;
            while (parentFolderId) {
              const currentParentFolderId = parentFolderId;
              foldersToExpand.push(parentFolderId);
              parentFolderId = folders.data?.find((folder) => folder.id === currentParentFolderId)?.parent_id;
            }
            dispatch(SearchActions.expandFolders(foldersToExpand.map((id) => id.toString())));
            handleClose();
          },
        },
      );
    },
    [createFolderMutation, dispatch, handleClose, projectId, folders.data],
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
