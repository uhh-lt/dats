import AddCircleIcon from "@mui/icons-material/AddCircle";
import LabelIcon from "@mui/icons-material/Label";
import { Button, PopoverOrigin } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import React, { useState } from "react";
import TagMenu from "./TagMenu.tsx";

interface TagMenuButtonProps {
  popoverOrigin: PopoverOrigin | undefined;
  forceSdocId?: number;
  type?: string;
}

function TagMenuButton({ forceSdocId, popoverOrigin, type }: TagMenuButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  return (
    <>
      {type !== "addBtn" ? (
        <Tooltip title="Tags">
          <IconButton onClick={handleClick}>
            <LabelIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Button variant="text" size="small" sx={{ ml: 2, mb: 1 }} onClick={handleClick} startIcon={<AddCircleIcon />}>
          Add Tags
        </Button>
      )}
      <TagMenu forceSdocId={forceSdocId} anchorEl={anchorEl} setAnchorEl={setAnchorEl} popoverOrigin={popoverOrigin} />
    </>
  );
}

export default TagMenuButton;
