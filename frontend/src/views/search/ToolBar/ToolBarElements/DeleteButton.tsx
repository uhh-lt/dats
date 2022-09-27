import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import * as React from "react";
import { IconButtonProps } from "@mui/material";
import SdocHooks from "../../../../api/SdocHooks";
import { useCallback } from "react";
import ConfirmationAPI from "../../../../features/ConfirmationDialog/ConfirmationAPI";
import SnackbarAPI from "../../../../features/snackbar/SnackbarAPI";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../../../plugins/ReduxHooks";
import { SearchActions } from "../../searchSlice";

interface DeleteButtonProps {
  sdocId: number;
}

function DeleteButton({ sdocId, ...props }: DeleteButtonProps & IconButtonProps) {
  // react router
  const navigate = useNavigate();

  // mutations
  const deleteMutation = SdocHooks.useDeleteDocument();

  // redux
  const dispatch = useAppDispatch();

  // ui events
  const onClick = useCallback(() => {
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
  }, [deleteMutation, dispatch, navigate, sdocId]);

  return (
    <Tooltip title="Delete">
      <span>
        <IconButton onClick={onClick} {...props}>
          <DeleteIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default DeleteButton;
