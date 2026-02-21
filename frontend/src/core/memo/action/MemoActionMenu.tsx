import { IconButton, IconButtonProps, Menu } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import { MemoDeleteMenuItem } from "./MemoDeleteMenuItem.tsx";
import { MemoStarMenuItem } from "./MemoStarMenuItem.tsx";

interface MemoActionsMenuProps {
  memo?: MemoRead;
  onStarredClick?: () => void;
  onDeleteClick?: () => void;
  iconButtonProps?: Omit<IconButtonProps, "onClick" | "disabled">;
}

export const MemoActionMenu = memo(({ memo, onStarredClick, onDeleteClick, iconButtonProps }: MemoActionsMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleDeleteClick = useCallback(() => {
    if (onDeleteClick) {
      onDeleteClick();
    }
    setAnchorEl(null);
  }, [onDeleteClick]);

  const handleStarredClick = useCallback(() => {
    if (onStarredClick) {
      onStarredClick();
    }
    setAnchorEl(null);
  }, [onStarredClick]);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <>
      <IconButton onClick={handleClick} disabled={!memo} {...iconButtonProps}>
        {getIconComponent(Icon.CONTEXT_MENU)}
      </IconButton>
      {memo && (
        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          <MemoStarMenuItem onClick={handleStarredClick} memoId={memo.id} isStarred={memo.starred} />
          <MemoDeleteMenuItem memoId={memo.id} memoTitle={memo.title} onClick={handleDeleteClick} />
        </Menu>
      )}
    </>
  );
});
