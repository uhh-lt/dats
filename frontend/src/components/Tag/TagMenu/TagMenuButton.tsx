import { Button, PopoverOrigin } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import React, { useState } from "react";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import TagMenu from "./TagMenu.tsx";

interface TagMenuButtonProps {
  popoverOrigin: PopoverOrigin | undefined;
  type?: string;
  selectedSdocIds: number[];
}

function TagMenuButton({ popoverOrigin, type, selectedSdocIds }: TagMenuButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  return (
    <>
      {type !== "addBtn" ? (
        <Tooltip title="Tags">
          <IconButton onClick={handleClick}>{getIconComponent(Icon.TAG)}</IconButton>
        </Tooltip>
      ) : (
        <Button variant="text" size="small" onClick={handleClick} startIcon={getIconComponent(Icon.ADD)}>
          Add Tags
        </Button>
      )}
      <TagMenu sdocIds={selectedSdocIds} anchorEl={anchorEl} setAnchorEl={setAnchorEl} popoverOrigin={popoverOrigin} />
    </>
  );
}

export default TagMenuButton;
