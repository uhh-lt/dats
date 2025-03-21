import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { memo, useCallback } from "react";
import TagHooks from "../../../api/TagHooks.ts";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import ConfirmationAPI from "../../ConfirmationDialog/ConfirmationAPI.ts";

function TagUnlinkButton({ sdocId, tag, ...props }: IconButtonProps & { sdocId: number; tag: DocumentTagRead }) {
  // mutations
  const { mutate: removeTagMutation, isPending } = TagHooks.useBulkUnlinkDocumentTags();

  // actions
  const handleDeleteDocumentTag = useCallback(() => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the DocumentTag "${tag.name}" from SourceDocument ${sdocId} ? You can reassign this tag later!`,
      onAccept: () => {
        removeTagMutation({
          requestBody: {
            source_document_ids: [sdocId],
            document_tag_ids: [tag.id],
          },
        });
      },
    });
  }, [removeTagMutation, tag, sdocId]);

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

export default memo(TagUnlinkButton);
