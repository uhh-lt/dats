import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuProps {
  position: ContextMenuPosition | null;
  handleClose: () => void;
}

interface ProjectContextMenuProps extends ContextMenuProps {
  projectId: number | undefined;
}

function ProjectContextMenu2({ position, projectId, handleClose }: ProjectContextMenuProps) {
  return (
    <Menu
      open={position !== null}
      onClose={handleClose}
      anchorPosition={position !== null ? { top: position.y, left: position.x } : undefined}
      anchorReference="anchorPosition"
      onContextMenu={(e) => {
        e.preventDefault();
        handleClose();
      }}
      // PaperProps={{ sx: { width: 240, height: 300 } }}
    >
      <MenuItem component={Link} to={`/project/${projectId}/search`}>
        <ListItemIcon>
          <PlayCircleIcon fontSize="medium" />
        </ListItemIcon>
        <ListItemText>Open project</ListItemText>
      </MenuItem>
      <MenuItem component={Link} to={`/projectsettings/${projectId}`}>
        <ListItemIcon>
          <EditIcon fontSize="medium" />
        </ListItemIcon>
        <ListItemText>Edit project</ListItemText>
      </MenuItem>
    </Menu>
  );
}

export default ProjectContextMenu2;
