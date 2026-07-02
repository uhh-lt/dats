import { getIconComponent, Icon } from "@components/icons";
import { Button, PopoverOrigin } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { memo, MouseEventHandler, useCallback, useState } from "react";
import { FolderActionMenu } from "./_components/FolderActionMenu";

interface FolderActionMenuButtonProps {
  popoverOrigin?: PopoverOrigin;
  type?: string;
  selectedFolderIds: number[];
  onMoveFolder?: () => void;
}

export const FolderActionMenuButton = memo(
  ({ popoverOrigin, type, selectedFolderIds, onMoveFolder }: FolderActionMenuButtonProps) => {
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
          onMoveFolder={onMoveFolder}
        />
      </>
    );
  },
);
