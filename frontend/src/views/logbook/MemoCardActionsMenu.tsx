import { IconButton, Menu } from "@mui/material";
import { QueryObserverSuccessResult } from "@tanstack/react-query";
import { MemoRead } from "../../api/openapi";

import { useState } from "react";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import MemoStarMenuItem from "../../features/Memo/MemoStarMenuItem";
import MemoEditMenuItem from "../../features/Memo/MemoEditMenuItem";
import MemoDeleteMenuItem from "../../features/Memo/MemoDeleteMenuItem";
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
        <MemoStarMenuItem onClick={handleClose} memoId={memo.data.id} isStarred={memo.data.starred} />

        <MemoEditMenuItem
          memoId={memo.data.id}
          attachedObjectType={memo.data.attached_object_type}
          attachedObjectId={memo.data.attached_object_id}
          onClick={handleClose}
        />

        <MemoDeleteMenuItem
          memoId={memo.data.id}
          memoTitle={memo.data.title}
          attachedObjectType={memo.data.attached_object_type}
          attachedObjectId={memo.data.attached_object_id}
          onClick={handleClose}
        />
      </Menu>
    </div>
  );
}
