import { MemoHooks } from "@api/hooks/MemoHooks";
import { getIconComponent, Icon } from "@components/icons";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { memo, useCallback } from "react";

interface MemoCreateIconButtonProps {
  attachedObjectId: number;
  attachedObjectType: AttachedObjectType;
  onCreated?: (memoId: number) => void;
  title?: string;
}

/**
 * Creates a new empty memo attached to the given object.
 */
export const MemoCreateIconButton = memo(
  ({
    attachedObjectId,
    attachedObjectType,
    onCreated,
    title = "Create memo",
    ...props
  }: MemoCreateIconButtonProps & IconButtonProps) => {
    const createMemo = MemoHooks.useCreateMemo();

    const handleCreate = useCallback(() => {
      createMemo.mutate(
        {
          attachedObjectId,
          attachedObjectType,
          requestBody: { title: "Untitled", content: "", content_json: "" },
        },
        { onSuccess: (memo) => onCreated?.(memo.id) },
      );
    }, [createMemo, attachedObjectId, attachedObjectType, onCreated]);

    return (
      <Tooltip title={title}>
        <span>
          <IconButton size="small" onClick={handleCreate} disabled={createMemo.isPending} {...props}>
            {getIconComponent(Icon.CREATE)}
          </IconButton>
        </span>
      </Tooltip>
    );
  },
);
