import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { memo, useCallback } from "react";
import { TagHooks } from "../../api/TagHooks.ts";
import { TagRead } from "../../api/openapi/models/TagRead.ts";
import { ConfirmationAPI } from "../../components/ConfirmationDialog/ConfirmationAPI.ts";

export const TagUnlinkButton = memo(({ sdocId, tag, ...props }: IconButtonProps & { sdocId: number; tag: TagRead }) => {
  // mutations
  const { mutate: removeTagMutation, isPending } = TagHooks.useBulkUnlinkTags();

  // actions
  const handleDeleteDocumentTag = useCallback(() => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the DocumentTag "${tag.name}" from SourceDocument ${sdocId} ? You can reassign this tag later!`,
      onAccept: () => {
        removeTagMutation({
          requestBody: {
            source_document_ids: [sdocId],
            tag_ids: [tag.id],
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
});
