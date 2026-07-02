import { SdocHooks } from "@api/hooks/SdocHooks";
import { useOpenConfirmationDialog } from "@core/notification";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButtonProps } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { memo, useCallback } from "react";

interface DeleteSdocsButtonProps {
  sdocIds: number[];
  onDeleted?: (deletedSdocIds: number[]) => void;
}

export const DeleteSdocsButton = memo(({ sdocIds, onDeleted, ...props }: DeleteSdocsButtonProps & IconButtonProps) => {
  // mutations
  const { mutate: deleteDocuments } = SdocHooks.useDeleteDocuments();

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
              onDeleted?.(sdocs.map((sdoc) => sdoc.id));
            },
          },
        );
      },
    });
  }, [deleteDocuments, onDeleted, openConfirmationDialog, sdocIds]);

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
