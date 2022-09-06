import React, { forwardRef, useImperativeHandle, useRef } from "react";
import SuperContextMenu, { SuperContextMenuHandle, SuperContextMenuPosition } from "./SuperContextMenu";
import { ListItemIcon, ListItemText, MenuItem, Typography } from "@mui/material";
import LabelIcon from "@mui/icons-material/Label";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";

interface ProjectContextMenuProps {}

export interface ProjectContextMenuHandle {
  openContextMenu: (projectId: number, position: SuperContextMenuPosition) => void;
  closeContextMenu: () => void;
}

const ProjectContextMenu = forwardRef<ProjectContextMenuHandle, ProjectContextMenuProps>(({}, ref) => {
  const contextMenuRef = useRef<SuperContextMenuHandle>(null);

  // local client state
  const [currentProjectId, setCurrentProjectId] = React.useState<number | null>(null);

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    openContextMenu,
    closeContextMenu,
  }));

  // methods
  const openContextMenu = (projectId: number, position: SuperContextMenuPosition) => {
    setCurrentProjectId(projectId);
    contextMenuRef.current!.openContextMenu(position);
  };
  const closeContextMenu = () => contextMenuRef.current!.closeContextMenu();

  return (
    <SuperContextMenu ref={contextMenuRef}>
      <MenuItem>
        <ListItemIcon>
          <LabelIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>haha {currentProjectId}</ListItemText>
        <Typography variant="body2" color="text.secondary" align={"center"}>
          <ArrowRightIcon />
        </Typography>
      </MenuItem>
    </SuperContextMenu>
  );
});

export default ProjectContextMenu;
