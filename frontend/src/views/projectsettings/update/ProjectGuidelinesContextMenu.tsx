import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { ContextMenuPosition } from "../../../components/ContextMenu/ContextMenuPosition";

interface ProjectGuidelinesContextMenuProps {
  position: ContextMenuPosition | null;
  projectId: number;
  guidelinesId: number | undefined;
  handleClose: () => void;
  onDeleteGuidelines: (guidelinesId: number) => void;
}

function ProjectGuidelinesContextMenu({
  position,
  projectId,
  guidelinesId,
  handleClose,
  onDeleteGuidelines,
}: ProjectGuidelinesContextMenuProps) {
  const navigate = useNavigate();

  const openGuidelines = () => {
    handleClose();
    navigate(`/project/${projectId}/search/doc/${guidelinesId}`); // TODO
  };

  const deleteGuidelines = () => {
    if (!guidelinesId) return;
    handleClose();
    onDeleteGuidelines(guidelinesId);
  };

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
      <MenuItem onClick={openGuidelines}>
        <ListItemIcon>
          <PlayCircleIcon fontSize="medium" />
        </ListItemIcon>
        <ListItemText>View Guidelines</ListItemText>
      </MenuItem>
      <MenuItem onClick={deleteGuidelines}>
        <ListItemIcon>
          <DeleteIcon fontSize="medium" />
        </ListItemIcon>
        <ListItemText>Delete Guidelines</ListItemText>
      </MenuItem>
    </Menu>
  );
}

export default ProjectGuidelinesContextMenu;
