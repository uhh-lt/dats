import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { List, ListItemIcon, ListItemText, MenuItem, Popover, PopoverPosition } from "@mui/material";
import { forwardRef, useImperativeHandle, useState } from "react";
import { useNavigate } from "react-router-dom";
import DeleteMenuItem from "../../search/ToolBar/ToolBarElements/DeleteMenuItem";

interface ProjectDocumentsContextMenuProps {
}

export interface ProjectDocumentsContextMenuHandle {
  open: (position: PopoverPosition, projectId: number, sdocId: number | undefined) => void;
  close: () => void;
}


const ProjectDocumentsContextMenu = forwardRef<ProjectDocumentsContextMenuHandle, ProjectDocumentsContextMenuProps>(({ }, ref) => {
  const navigate = useNavigate();

  // local state
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [projectId, setProjectId] = useState<number>();
  const [sdocId, setSdocId] = useState<number>();

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openContextMenu,
    close: closeContextMenu,
  }));

  // methods
  const openContextMenu = (position: PopoverPosition, projectId: number, sdocId: number | undefined) => {
    setIsPopoverOpen(true);
    setPosition(position);
    setProjectId(projectId);
    setSdocId(sdocId);
  };

  const closeContextMenu = () => {
    setIsPopoverOpen(false);
  };

  // ui events
  const onContextMenu = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.preventDefault();
    closeContextMenu();
  };

  const openDocument = () => {
    closeContextMenu();
    navigate(`/project/${projectId}/search/doc/${sdocId}`);
  };

  return (
    <Popover
      open={isPopoverOpen}
      onClose={closeContextMenu}
      anchorPosition={position}
      anchorReference="anchorPosition"
      anchorOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      onContextMenu={onContextMenu}
    >

      <List>
        <MenuItem onClick={openDocument}>
          <ListItemIcon>
            <PlayCircleIcon fontSize="medium" />
          </ListItemIcon>
          <ListItemText>Open document</ListItemText>
        </MenuItem>
        <DeleteMenuItem onClick={closeContextMenu} sdocId={sdocId} />
      </List>

    </Popover>
  );
});

export default ProjectDocumentsContextMenu;
