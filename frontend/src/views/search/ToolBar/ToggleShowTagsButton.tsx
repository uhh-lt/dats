import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import * as React from "react";

interface ToggleShowTagsButtonProps {
  showTags: boolean;
  handleClick: () => void;
}

function ToggleShowTagsButton({ showTags, handleClick }: ToggleShowTagsButtonProps) {
  return (
    <Tooltip title="Show/hide tags">
      <IconButton onClick={() => handleClick()}>{showTags ? <VisibilityIcon /> : <VisibilityOffIcon />}</IconButton>
    </Tooltip>
  );
}

export default ToggleShowTagsButton;
