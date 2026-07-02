import { TagHooks } from "@api/hooks/TagHooks";
import { useOpenConfirmationDialog } from "@core/notification";
import { TagRead } from "@models/TagRead";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { memo, useCallback } from "react";

export const TagUnlinkButton = memo(({ sdocId, tag, ...props }: IconButtonProps & { sdocId: number; tag: TagRead }) => {
  // mutations
  const { mutate: removeTagMutation, isPending } = TagHooks.useBulkUnlinkTags();

  // actions
  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleDeleteDocumentTag = useCallback(() => {
    openConfirmationDialog({
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
  }, [openConfirmationDialog, tag.name, tag.id, sdocId, removeTagMutation]);

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
