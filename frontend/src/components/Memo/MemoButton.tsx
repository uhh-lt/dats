import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import React from "react";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import MemoDialogAPI, { MemoEvent } from "./MemoDialog/MemoDialogAPI.ts";

interface MemoButtonProps {
  onClick?: () => void;
}

export default function MemoButton({
  memoId,
  attachedObjectType,
  attachedObjectId,
  onClick,
  ...props
}: MemoButtonProps & MemoEvent & IconButtonProps) {
  const handleClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    if (onClick) onClick();
    MemoDialogAPI.openMemo({ memoId, attachedObjectType, attachedObjectId });
  };

  return (
    <Tooltip title="Memo">
      <span>
        <IconButton onClick={handleClickOpen} {...(props as IconButtonProps)}>
          {getIconComponent(Icon.MEMO)}
        </IconButton>
      </span>
    </Tooltip>
  );
}
