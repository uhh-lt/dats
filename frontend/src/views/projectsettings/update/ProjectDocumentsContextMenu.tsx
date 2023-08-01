import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ContextMenuPosition } from "../../../components/ContextMenu/ContextMenuPosition";
import DeleteMenuItem from "../../search/ToolBar/ToolBarElements/DeleteMenuItem";

interface ProjectDocumentsContextMenuProps {
  position: ContextMenuPosition | null;
  projectId: number;
  sdocId: number | undefined;
  handleClose: () => void;
}

function ProjectDocumentsContextMenu({ position, projectId, sdocId, handleClose }: ProjectDocumentsContextMenuProps) {
  const navigate = useNavigate();

  const openDocument = () => {
    handleClose();
    navigate(`/project/${projectId}/search/doc/${sdocId}`);
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
      <DeleteMenuItem onClick={handleClose} sdocId={sdocId} />
    </Menu>
  );
}

export default ProjectDocumentsContextMenu;
