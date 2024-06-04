import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, Menu } from "@mui/material";
import { useState } from "react";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import MemoDeleteMenuItem from "../MemoDeleteMenuItem.tsx";
import MemoEditMenuItem from "../MemoEditMenuItem.tsx";
import MemoStarMenuItem from "../MemoStarMenuItem.tsx";

interface MemoCardActionsMenuProps {
  memo: MemoRead;
}

export default function MemoCardActionsMenu({ memo }: MemoCardActionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
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
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <MemoStarMenuItem onClick={handleClose} memoId={memo.id} isStarred={memo.starred} />

        <MemoEditMenuItem
          memoId={memo.id}
          attachedObjectType={memo.attached_object_type}
          attachedObjectId={memo.attached_object_id}
          onClick={handleClose}
        />

        <MemoDeleteMenuItem
          memoId={memo.id}
          memoTitle={memo.title}
          attachedObjectType={memo.attached_object_type}
          attachedObjectId={memo.attached_object_id}
          onClick={handleClose}
        />
      </Menu>
    </div>
  );
}
