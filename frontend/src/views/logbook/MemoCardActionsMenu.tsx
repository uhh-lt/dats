import { IconButton, Menu, MenuItem } from "@mui/material";
import MemoEditButton from "../../features/Memo/MemoEditButton";
import MemoStarButton from "../../features/Memo/MemoStarButton";
import { QueryObserverSuccessResult } from "@tanstack/react-query";
import { MemoRead } from "../../api/openapi";

import { useState } from "react";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import MemoDeleteButton from "../../features/Memo/MemoDeleteButton";
interface MemoCardActionsMenuProps {
  memo: QueryObserverSuccessResult<MemoRead, Error>;
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
        <MenuItem onClick={handleClose}>
          <MemoStarButton memoId={memo.data.id} isStarred={memo.data.starred} />
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <MemoEditButton
            memoId={memo.data.id}
            attachedObjectType={memo.data.attached_object_type}
            attachedObjectId={memo.data.attached_object_id}
          />
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <MemoDeleteButton memo={memo.data} />
        </MenuItem>
      </Menu>
    </div>
  );
}
