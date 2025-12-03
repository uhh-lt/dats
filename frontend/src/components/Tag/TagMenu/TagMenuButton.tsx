import { Button, PopoverOrigin } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import React, { memo, useCallback, useState } from "react";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import TagMenu from "./TagMenu.tsx";

interface TagMenuButtonProps {
  popoverOrigin?: PopoverOrigin;
  type?: string;
  selectedSdocIds: number[];
}

function TagMenuButton({ popoverOrigin, type, selectedSdocIds }: TagMenuButtonProps) {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  if (!projectId) {
    return null;
  }

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
      <TagMenu
        projectId={projectId}
        sdocIds={selectedSdocIds}
        anchorEl={anchorEl}
        setAnchorEl={setAnchorEl}
        popoverOrigin={popoverOrigin}
      />
    </>
  );
}

export default memo(TagMenuButton);
