import { Button, PopoverOrigin } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { memo, MouseEventHandler, useCallback, useState } from "react";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { TagMenu } from "./components/TagMenu.tsx";

interface TagMenuButtonProps {
  popoverOrigin?: PopoverOrigin;
  type?: string;
  selectedSdocIds: number[];
}

export const TagMenuButton = memo(({ popoverOrigin, type, selectedSdocIds }: TagMenuButtonProps) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback((event) => {
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
});
