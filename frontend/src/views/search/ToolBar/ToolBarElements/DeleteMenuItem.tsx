import DeleteIcon from "@mui/icons-material/Delete";
import * as React from "react";
import { useCallback } from "react";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import SdocHooks from "../../../../api/SdocHooks";
import ConfirmationAPI from "../../../../features/ConfirmationDialog/ConfirmationAPI";
import SnackbarAPI from "../../../../features/Snackbar/SnackbarAPI";
import { useNavigate } from "react-router-dom";
import { SearchActions } from "../../searchSlice";
import { useAppDispatch } from "../../../../plugins/ReduxHooks";

interface DeleteMenuItemProps {
  sdocId: number | undefined;
  navigateTo?: string;
  onClick?: () => void;
}

function DeleteMenuItem({ sdocId, navigateTo, onClick, ...props }: DeleteMenuItemProps & MenuItemProps) {
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
        deleteMutation.mutate(
          {
            sdocIds: [sdocId],
          },
          {
            onSuccess: (sdocs) => {
              console.log("HOHOH");
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
          }
        );
      },
      onReject: () => {
        if (onClick) onClick();
      },
    });
  }, [deleteMutation, dispatch, navigate, onClick, sdocId, navigateTo]);

  return (
    <MenuItem onClick={handleClick} {...props} disabled={!sdocId}>
      <ListItemIcon>
        <DeleteIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Delete document</ListItemText>
    </MenuItem>
  );
}

export default DeleteMenuItem;
