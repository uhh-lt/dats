import { IconButton, IconButtonProps, Menu } from "@mui/material";
import { useState } from "react";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import MemoDeleteMenuItem from "./MemoDeleteMenuItem.tsx";
import MemoStarMenuItem from "./MemoStarMenuItem.tsx";

interface MemoActionsMenuProps {
  memo?: MemoRead;
  onStarredClick?: () => void;
  onDeleteClick?: () => void;
  iconButtonProps?: Omit<IconButtonProps, "onClick" | "disabled">;
}

export default function MemoActionsMenu({
  memo,
  onStarredClick,
  onDeleteClick,
  iconButtonProps,
}: MemoActionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDeleteClick = () => {
    if (onDeleteClick) {
      onDeleteClick();
    }
    setAnchorEl(null);
  };

  const handleStarredClick = () => {
    if (onStarredClick) {
      onStarredClick();
    }
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton onClick={handleClick} disabled={!memo} {...iconButtonProps}>
        {getIconComponent(Icon.CONTEXT_MENU)}
      </IconButton>
      {memo && (
        <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
          <MemoStarMenuItem onClick={handleStarredClick} memoId={memo.id} isStarred={memo.starred} />
          <MemoDeleteMenuItem
            memoId={memo.id}
            memoTitle={memo.title}
            attachedObjectType={memo.attached_object_type}
            attachedObjectId={memo.attached_object_id}
            onClick={handleDeleteClick}
          />
        </Menu>
      )}
    </>
  );
}
