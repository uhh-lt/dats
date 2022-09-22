import DeleteIcon from "@mui/icons-material/Delete";
import * as React from "react";
import { useCallback } from "react";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import SdocHooks from "../../../../api/SdocHooks";
import ConfirmationAPI from "../../../../features/ConfirmationDialog/ConfirmationAPI";
import SnackbarAPI from "../../../../features/snackbar/SnackbarAPI";
import { useNavigate } from "react-router-dom";
import { SearchActions } from "../../searchSlice";
import { useAppDispatch } from "../../../../plugins/ReduxHooks";

interface DeleteMenuItemProps {
  sdocId: number | undefined;
  onClick?: () => void;
}

function DeleteMenuItem({ sdocId, onClick, ...props }: DeleteMenuItemProps & MenuItemProps) {
  // react router
  const navigate = useNavigate();

  // mutations
  const deleteMutation = SdocHooks.useDeleteDocument();

  // redux
  const dispatch = useAppDispatch();

  // ui events
  const handleClick = useCallback(() => {
    if (!sdocId) return;

    if (onClick) onClick();

    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to delete document ${sdocId}? This action cannot be undone and  will remove all annotations as well as memos associated with this document!`,
      onAccept: () => {
        deleteMutation.mutate(
          {
            sdocId: sdocId,
          },
          {
            onSuccess: (sdoc) => {
              SnackbarAPI.openSnackbar({
                text: `Successfully deleted document ${sdoc.filename}`,
                severity: "success",
              });
              navigate("../search");
              dispatch(SearchActions.updateSelectedDocumentsOnDelete(sdoc.id));
            },
          }
        );
      },
    });
  }, []);

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
