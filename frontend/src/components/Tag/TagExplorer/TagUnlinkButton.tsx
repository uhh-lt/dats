import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { useCallback } from "react";
import TagHooks from "../../../api/TagHooks.ts";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import ConfirmationAPI from "../../../features/ConfirmationDialog/ConfirmationAPI.ts";
import { useOpenSnackbar } from "../../../features/SnackbarDialog/useOpenSnackbar.ts";

function TagUnlinkButton({ sdocId, tag, ...props }: IconButtonProps & { sdocId: number; tag: DocumentTagRead }) {
  // mutations
  const { mutate: removeTagMutation, isPending } = TagHooks.useBulkUnlinkDocumentTags();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // actions
  const handleDeleteDocumentTag = useCallback(() => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the DocumentTag "${tag.name}" from SourceDocument ${sdocId} ? You can reassign this tag later!`,
      onAccept: () => {
        removeTagMutation(
          {
            projectId: tag.project_id,
            requestBody: {
              source_document_ids: [sdocId],
              document_tag_ids: [tag.id],
            },
          },
          {
            onSuccess: () => {
              openSnackbar({
                text: `Removed tag from document ${sdocId}!`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  }, [removeTagMutation, tag, sdocId, openSnackbar]);

  return (
    <Tooltip title="Remove tag from document">
      <span>
        <IconButton onClick={handleDeleteDocumentTag} disabled={isPending} {...props}>
          <DeleteIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default TagUnlinkButton;
