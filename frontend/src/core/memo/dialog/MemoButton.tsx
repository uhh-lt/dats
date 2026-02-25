import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { memo, useCallback } from "react";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils";
import { MemoEvent } from "./_types/MemoEvent";
import { useOpenMemoDialog } from "./useOpenMemoDialog";

interface MemoButtonProps {
  onClick?: () => void;
}

export const MemoButton = memo(
  ({
    memoId,
    attachedObjectType,
    attachedObjectId,
    onClick,
    ...props
  }: MemoButtonProps & MemoEvent & IconButtonProps) => {
    const openMemoDialog = useOpenMemoDialog();
    const handleClickOpen = useCallback(
      (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.stopPropagation();
        if (onClick) onClick();
        openMemoDialog({ memoId, attachedObjectType, attachedObjectId });
      },
      [memoId, attachedObjectType, attachedObjectId, onClick],
    );

    return (
      <Tooltip title="Memo">
        <span>
          <IconButton onClick={handleClickOpen} {...(props as IconButtonProps)}>
            {getIconComponent(Icon.MEMO)}
          </IconButton>
        </span>
      </Tooltip>
    );
  },
);
