import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, Menu } from "@mui/material";
import { useState } from "react";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import MemoDeleteMenuItem from "./MemoDeleteMenuItem.tsx";
import MemoStarMenuItem from "./MemoStarMenuItem.tsx";

interface MemoActionsMenuProps {
  memo: MemoRead;
  onStarredClick?: () => void;
  onDeleteClick?: () => void;
}

export default function MemoActionsMenu({ memo, onStarredClick, onDeleteClick }: MemoActionsMenuProps) {
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
      <IconButton
        id="icon-button"
        aria-controls={open ? "menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <MemoStarMenuItem onClick={handleStarredClick} memoId={memo.id} isStarred={memo.starred} />
        <MemoDeleteMenuItem
          memoId={memo.id}
          memoTitle={memo.title}
          attachedObjectType={memo.attached_object_type}
          attachedObjectId={memo.attached_object_id}
          onClick={handleDeleteClick}
        />
      </Menu>
    </>
  );
}
