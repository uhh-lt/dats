import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { ContextMenuPosition } from "../../../components/ContextMenu/ContextMenuPosition";

interface ProjectTagsContextMenuProps {
  position: ContextMenuPosition | null;
  tagId: number | undefined;
  handleClose: () => void;
  onDeleteTag: (tagId: number) => void;
}

function ProjectTagsContextMenu({ position, tagId, handleClose, onDeleteTag }: ProjectTagsContextMenuProps) {
  const navigate = useNavigate();

  const openTag = () => {
    handleClose();
    navigate(`/tag/${tagId}`); // TODO
  };

  const deleteTag = () => {
    if (!tagId) return;
    handleClose();
    onDeleteTag(tagId);
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
    >
      <MenuItem onClick={openTag}>
        <ListItemIcon>
          <AccountCircleIcon fontSize="medium" />
        </ListItemIcon>
        <ListItemText>View tag</ListItemText>
      </MenuItem>
      <MenuItem onClick={deleteTag}>
        <ListItemIcon>
          <DeleteIcon fontSize="medium" />
        </ListItemIcon>
        <ListItemText>Remove tag from project</ListItemText>
      </MenuItem>
    </Menu>
  );
}

export default ProjectTagsContextMenu;
