import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SdocHooks from "../../api/SdocHooks.ts";
import ConfirmationAPI from "../../features/ConfirmationDialog/ConfirmationAPI.ts";
import SnackbarAPI from "../../features/SnackbarDialog/SnackbarAPI.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../views/search/DocumentSearch/searchSlice.ts";

interface DeleteSdocsMenuItemProps {
  sdocId: number | null | undefined;
  navigateTo?: string;
  onClick?: () => void;
}

function DeleteSdocsMenuItem({ sdocId, navigateTo, onClick, ...props }: DeleteSdocsMenuItemProps & MenuItemProps) {
  // react router
  const navigate = useNavigate();

  // mutations
  const deleteMutation = SdocHooks.useDeleteDocuments();

  // redux
  const dispatch = useAppDispatch();

  // ui events
  const handleClick = useCallback(() => {
    if (!sdocId) return;

    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to delete document(s) ${sdocId}? This action cannot be undone and  will remove all annotations as well as memos associated with this document!`,
      onAccept: () => {
        const mutation = deleteMutation.mutate;
        mutation(
          {
            sdocIds: [sdocId],
          },
          {
            onSuccess: (sdocs) => {
              const filenames = sdocs.map((sdoc) => sdoc.filename).join(", ");
              SnackbarAPI.openSnackbar({
                text: `Successfully deleted ${sdocs.length} document(s): ${filenames}`,
                severity: "success",
              });
              dispatch(SearchActions.updateSelectedDocumentsOnMultiDelete(sdocs.map((sdoc) => sdoc.id)));
              if (navigateTo) navigate(navigateTo);
            },
            onSettled: () => {
              if (onClick) onClick();
            },
          },
        );
      },
      onReject: () => {
        if (onClick) onClick();
      },
    });
  }, [deleteMutation.mutate, dispatch, navigate, onClick, sdocId, navigateTo]);

  return (
    <MenuItem onClick={handleClick} {...props} disabled={!sdocId}>
      <ListItemIcon>
        <DeleteIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Delete document</ListItemText>
    </MenuItem>
  );
}

export default DeleteSdocsMenuItem;
