import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import * as React from "react";
import { IconButtonProps } from "@mui/material";
import SdocHooks from "../../../../api/SdocHooks";
import { useCallback } from "react";
import ConfirmationAPI from "../../../../features/ConfirmationDialog/ConfirmationAPI";
import SnackbarAPI from "../../../../features/Snackbar/SnackbarAPI";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../../../plugins/ReduxHooks";
import { SearchActions } from "../../searchSlice";

interface DeleteButtonProps {
  sdocIds: number[];
  navigateTo?: string;
}

function DeleteButton({ sdocIds, navigateTo, ...props }: DeleteButtonProps & IconButtonProps) {
  // react router
  const navigate = useNavigate();

  // mutations
  const deleteMutation = SdocHooks.useDeleteDocuments();

  // redux
  const dispatch = useAppDispatch();

  // ui events
  const onClick = useCallback(() => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to delete document(s) ${sdocIds.join(
        ", "
      )}? This action cannot be undone and  will remove all annotations as well as memos associated with this document!`,
      onAccept: () => {
        deleteMutation.mutate(
          {
            sdocIds: sdocIds,
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
          }
        );
      },
    });
  }, [deleteMutation, dispatch, navigate, navigateTo, sdocIds]);

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
