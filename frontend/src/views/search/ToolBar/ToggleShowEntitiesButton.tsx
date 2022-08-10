import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import * as React from "react";

interface ToggleShowEntitiesButtonProps {
  showEntities: boolean;
  handleClick: () => void;
}

function ToggleShowEntitiesButton({ showEntities, handleClick }: ToggleShowEntitiesButtonProps) {
  return (
    <Tooltip title="Show/hide entities">
      <IconButton onClick={() => handleClick()}>{showEntities ? <VisibilityIcon /> : <VisibilityOffIcon />}</IconButton>
    </Tooltip>
  );
}

export default ToggleShowEntitiesButton;
