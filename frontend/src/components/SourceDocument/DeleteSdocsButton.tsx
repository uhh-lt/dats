import DeleteIcon from "@mui/icons-material/Delete";
import { IconButtonProps } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SdocHooks from "../../api/SdocHooks.ts";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../views/search/DocumentSearch/searchSlice.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";

interface DeleteSdocsButtonProps {
  sdocIds: number[];
  navigateTo?: string;
}

function DeleteSdocsButton({ sdocIds, navigateTo, ...props }: DeleteSdocsButtonProps & IconButtonProps) {
  // react router
  const navigate = useNavigate();

  // mutations
  const deleteMutation = SdocHooks.useDeleteDocuments();

  // redux
  const dispatch = useAppDispatch();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // ui events
  const onClick = useCallback(() => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to delete document(s) ${sdocIds.join(
        ", ",
      )}? This action cannot be undone and  will remove all annotations as well as memos associated with this document!`,
      onAccept: () => {
        const mutation = deleteMutation.mutate;
        mutation(
          {
            sdocIds: sdocIds,
          },
          {
            onSuccess: (sdocs) => {
              const filenames = sdocs.map((sdoc) => sdoc.filename).join(", ");
              openSnackbar({
                text: `Successfully deleted ${sdocs.length} document(s): ${filenames}`,
                severity: "success",
              });
              dispatch(SearchActions.updateSelectedDocumentsOnMultiDelete(sdocs.map((sdoc) => sdoc.id)));
              if (navigateTo) navigate(navigateTo);
            },
          },
        );
      },
    });
  }, [deleteMutation.mutate, dispatch, navigate, navigateTo, sdocIds, openSnackbar]);

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

export default DeleteSdocsButton;
