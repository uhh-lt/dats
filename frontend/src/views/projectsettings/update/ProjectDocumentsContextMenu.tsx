import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { ContextMenuPosition } from "../../projects/ProjectContextMenu2";

interface ProjectDocumentsContextMenuProps {
  position: ContextMenuPosition | null;
  projectId: number;
  sdocId: number | undefined;
  handleClose: () => void;
  onDeleteDocument: (sdocId: number) => void;
}

function ProjectDocumentsContextMenu({
  position,
  projectId,
  sdocId,
  handleClose,
  onDeleteDocument,
}: ProjectDocumentsContextMenuProps) {
  const navigate = useNavigate();

  const openDocument = () => {
    handleClose();
    navigate(`/project/${projectId}/search/doc/${sdocId}`);
  };

  const deleteDocument = () => {
    if (!sdocId) return;
    handleClose();
    onDeleteDocument(sdocId);
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
      <MenuItem onClick={openDocument}>
        <ListItemIcon>
          <PlayCircleIcon fontSize="medium" />
        </ListItemIcon>
        <ListItemText>Open document</ListItemText>
      </MenuItem>
      <MenuItem onClick={deleteDocument}>
        <ListItemIcon>
          <DeleteIcon fontSize="medium" />
        </ListItemIcon>
        <ListItemText>Delete document</ListItemText>
      </MenuItem>
    </Menu>
  );
}

export default ProjectDocumentsContextMenu;
