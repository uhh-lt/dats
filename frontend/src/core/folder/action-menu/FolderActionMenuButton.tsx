import { Button, PopoverOrigin } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { memo, MouseEventHandler, useCallback, useState } from "react";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { FolderActionMenu } from "./components/FolderActionMenu.tsx";

interface FolderActionMenuButtonProps {
  popoverOrigin?: PopoverOrigin;
  type?: string;
  selectedFolderIds: number[];
}

export const FolderActionMenuButton = memo(
  ({ popoverOrigin, type, selectedFolderIds }: FolderActionMenuButtonProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback((event) => {
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
        <FolderActionMenu
          folderIds={selectedFolderIds}
          anchorEl={anchorEl}
          setAnchorEl={setAnchorEl}
          popoverOrigin={popoverOrigin}
        />
      </>
    );
  },
);
