import { getIconComponent, Icon } from "@components/icons";
import { IconButton, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { useShowFolders } from "../_hooks/useShowFolders";

export function FolderToggleVisibilityButton() {
  const [showFolders, toggleShowFolders] = useShowFolders();

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.stopPropagation();
      toggleShowFolders();
    },
    [toggleShowFolders],
  );

  return (
    <Tooltip title="Show/hide folders">
      <span>
        <IconButton onClick={handleClick}>{getIconComponent(showFolders ? Icon.FOLDER : Icon.FOLDER_OFF)}</IconButton>
      </span>
    </Tooltip>
  );
}
