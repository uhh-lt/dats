import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { useCallback, memo } from "react";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import MemoDialogAPI, { MemoEvent } from "./MemoDialog/MemoDialogAPI.ts";

interface MemoButtonProps {
  onClick?: () => void;
}

function MemoButton({
  memoId,
  attachedObjectType,
  attachedObjectId,
  onClick,
  ...props
}: MemoButtonProps & MemoEvent & IconButtonProps) {
  const handleClickOpen = useCallback(
    (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      event.stopPropagation();
      if (onClick) onClick();
      MemoDialogAPI.openMemo({ memoId, attachedObjectType, attachedObjectId });
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
}

export default memo(MemoButton);
