import { PopoverOrigin } from "@mui/material";
import React from "react";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import LabelIcon from "@mui/icons-material/Label";
import TagMenu from "../../Tags/TagMenu/TagMenu";

interface TagMenuButtonProps {
  popoverOrigin: PopoverOrigin | undefined;
  forceSdocId?: number;
}

function TagMenuButton({ forceSdocId, popoverOrigin }: TagMenuButtonProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  return (
    <>
      <Tooltip title="Labels">
        <IconButton onClick={handleClick}>
          <LabelIcon />
        </IconButton>
      </Tooltip>
      <TagMenu forceSdocId={forceSdocId} anchorEl={anchorEl} setAnchorEl={setAnchorEl} popoverOrigin={popoverOrigin} />
    </>
  );
}

export default TagMenuButton;
