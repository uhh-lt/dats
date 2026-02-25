import { useOpenConfirmationDialog } from "@core/notification";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButtonProps } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useAppDispatch } from "@plugins/redux";
import { useNavigate } from "@tanstack/react-router";
import { memo, useCallback } from "react";
import { SdocHooks } from "../../api/SdocHooks";
import { SearchActions } from "../../features/search/DocumentSearch/searchSlice";

interface DeleteSdocsButtonProps {
  sdocIds: number[];
  navigateTo?: string;
}

export const DeleteSdocsButton = memo(({ sdocIds, navigateTo, ...props }: DeleteSdocsButtonProps & IconButtonProps) => {
  // react router
  const navigate = useNavigate();

  // mutations
  const { mutate: deleteDocuments } = SdocHooks.useDeleteDocuments();

  // redux
  const dispatch = useAppDispatch();

  // ui events
  const openConfirmationDialog = useOpenConfirmationDialog();
  const onClick = useCallback(() => {
    openConfirmationDialog({
      text: `Do you really want to delete document(s) ${sdocIds.join(
        ", ",
      )}? This action cannot be undone and  will remove all annotations as well as memos associated with this document!`,
      type: "DELETE",
      onAccept: () => {
        deleteDocuments(
          {
            sdocIds: sdocIds,
          },
          {
            onSuccess: (sdocs) => {
              dispatch(SearchActions.updateSelectedDocumentsOnMultiDelete(sdocs.map((sdoc) => sdoc.id)));
              if (navigateTo) navigate({ to: navigateTo });
            },
          },
        );
      },
    });
  }, [deleteDocuments, dispatch, navigate, navigateTo, sdocIds]);

  return (
    <Tooltip title="Delete">
      <span>
        <IconButton onClick={onClick} {...props}>
          <DeleteIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
});
