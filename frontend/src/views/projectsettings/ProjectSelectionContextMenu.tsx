import EditIcon from "@mui/icons-material/Edit";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ContextMenuPosition } from "../../components/ContextMenu/ContextMenuPosition.ts";

interface ProjectContextMenuProps {
  position: ContextMenuPosition | null;
  projectId: number | undefined;
  handleClose: () => void;
}

function ProjectSelectionContextMenu({ position, projectId, handleClose }: ProjectContextMenuProps) {
  const navigate = useNavigate();

  const openProject = () => {
    handleClose();
    navigate(`/project/${projectId}/search`);
  };

  const editProject = () => {
    handleClose();
    navigate(`/projectsettings/${projectId}`);
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
      <MenuItem onClick={openProject}>
        <ListItemIcon>
          <PlayCircleIcon fontSize="medium" />
        </ListItemIcon>
        <ListItemText>Open project</ListItemText>
      </MenuItem>
      <MenuItem onClick={editProject}>
        <ListItemIcon>
          <EditIcon fontSize="medium" />
        </ListItemIcon>
        <ListItemText>Edit project</ListItemText>
      </MenuItem>
    </Menu>
  );
}

export default ProjectSelectionContextMenu;
