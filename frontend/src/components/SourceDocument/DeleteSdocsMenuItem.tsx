import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { memo, useCallback } from "react";
import SdocHooks from "../../api/SdocHooks.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../views/search/DocumentSearch/searchSlice.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";

interface DeleteSdocsMenuItemProps {
  sdocId: number | null | undefined;
  navigateTo?: string;
  onClick?: () => void;
}

function DeleteSdocsMenuItem({ sdocId, navigateTo, onClick, ...props }: DeleteSdocsMenuItemProps & MenuItemProps) {
  // react router
  const navigate = useNavigate();

  // mutations
  const { mutate: deleteDocuments } = SdocHooks.useDeleteDocuments();

  // redux
  const dispatch = useAppDispatch();

  // ui events
  const handleClick = useCallback(() => {
    if (!sdocId) return;
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to delete document(s) ${sdocId}? This action cannot be undone and  will remove all annotations as well as memos associated with this document!`,
      onAccept: () => {
        deleteDocuments(
          {
            sdocIds: [sdocId],
          },
          {
            onSuccess: (sdocs) => {
              dispatch(SearchActions.updateSelectedDocumentsOnMultiDelete(sdocs.map((sdoc) => sdoc.id)));
              if (navigateTo) navigate({ to: navigateTo });
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
  }, [deleteDocuments, dispatch, navigate, onClick, sdocId, navigateTo]);

  return (
    <MenuItem onClick={handleClick} {...props} disabled={!sdocId}>
      <ListItemIcon>
        <DeleteIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Delete document</ListItemText>
    </MenuItem>
  );
}

export default memo(DeleteSdocsMenuItem);
