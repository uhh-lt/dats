import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { ContextMenuPosition } from "../../projects/ProjectContextMenu2";

interface ProjectUsersContextMenuProps {
  position: ContextMenuPosition | null;
  userId: number | undefined;
  handleClose: () => void;
  onDeleteUser: (userId: number) => void;
}

function ProjectUsersContextMenu({ position, userId, handleClose, onDeleteUser }: ProjectUsersContextMenuProps) {
  const navigate = useNavigate();

  const openUser = () => {
    handleClose();
    navigate(`/user/${userId}`);
  };

  const deleteUser = () => {
    if (!userId) return;
    handleClose();
    onDeleteUser(userId);
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
      <MenuItem onClick={openUser}>
        <ListItemIcon>
          <AccountCircleIcon fontSize="medium" />
        </ListItemIcon>
        <ListItemText>View user</ListItemText>
      </MenuItem>
      <MenuItem onClick={deleteUser}>
        <ListItemIcon>
          <DeleteIcon fontSize="medium" />
        </ListItemIcon>
        <ListItemText>Remove user from project</ListItemText>
      </MenuItem>
    </Menu>
  );
}

export default ProjectUsersContextMenu;