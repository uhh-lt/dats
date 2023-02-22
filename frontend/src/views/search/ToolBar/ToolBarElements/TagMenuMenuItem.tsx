import { ListItemIcon, ListItemText, MenuItem, PopoverOrigin, Typography } from "@mui/material";
import React, { useState } from "react";
import TagMenu from "../../Tags/TagMenu/TagMenu";
import LabelIcon from "@mui/icons-material/Label";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";

interface TagMenuAsListProps {
  popoverOrigin: PopoverOrigin | undefined;
}

function TagMenuMenuItem({ popoverOrigin }: TagMenuAsListProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  };

  return (
    <>
      <MenuItem onClick={handleClick}>
        <ListItemIcon>
          <LabelIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Change tags</ListItemText>
        <Typography variant="body2" color="text.secondary" align={"center"}>
          <ArrowRightIcon />
        </Typography>
      </MenuItem>
      <TagMenu anchorEl={anchorEl} setAnchorEl={setAnchorEl} popoverOrigin={popoverOrigin} />
    </>
  );
}

export default TagMenuMenuItem;