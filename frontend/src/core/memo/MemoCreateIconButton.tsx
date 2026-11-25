import { getIconComponent, Icon } from "@components/icons";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { memo, useCallback } from "react";
import { MemoHooks } from "./api/memoHooks";

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
    const projectId = useParams({ strict: false, select: (params) => params.projectId });
    const createMemo = MemoHooks.useCreateMemo();

    const handleCreate = useCallback(() => {
      if (projectId === undefined) return;
      createMemo.mutate(
        {
          projectId,
          attachedObjectId,
          attachedObjectType,
          requestBody: { title: "Untitled", content: "", content_json: "" },
        },
        { onSuccess: (memo) => onCreated?.(memo.id) },
      );
    }, [createMemo, projectId, attachedObjectId, attachedObjectType, onCreated]);

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
