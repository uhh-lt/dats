import { Button, PopoverOrigin } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import React, { memo, useCallback, useState } from "react";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import FolderMenu from "./FolderMenu.tsx";

interface FolderMenuButtonProps {
  popoverOrigin?: PopoverOrigin;
  type?: string;
  selectedFolderIds: number[];
}

function FolderMenuButton({ popoverOrigin, type, selectedFolderIds }: FolderMenuButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  return (
    <>
      {type !== "addBtn" ? (
        <Tooltip title="Folders">
          <IconButton onClick={handleClick}>{getIconComponent(Icon.FOLDER)}</IconButton>
        </Tooltip>
      ) : (
        <Button variant="text" size="small" onClick={handleClick} startIcon={getIconComponent(Icon.ADD)}>
          Add Folders
        </Button>
      )}
      <FolderMenu
        folderIds={selectedFolderIds}
        anchorEl={anchorEl}
        setAnchorEl={setAnchorEl}
        popoverOrigin={popoverOrigin}
      />
    </>
  );
}

export default memo(FolderMenuButton);
