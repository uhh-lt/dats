import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import React from "react";
import BorderColorIcon from "@mui/icons-material/BorderColor";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Link } from "react-router-dom";
import { ContextMenuProps } from "../../views/projects/ProjectContextMenu2";
import TagMenuListButtton from "../../views/search/SearchResults/TagMenuListButtton";
import MemoMenuItem from "../memo-dialog/MemoMenuItem";

interface DocumentExplorerContextMenuProps extends ContextMenuProps {
  projectId: number;
  sdocId: number | undefined;
}

function DocumentExplorerContextMenu({ position, projectId, sdocId, handleClose }: DocumentExplorerContextMenuProps) {
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
      PaperProps={{ sx: { width: 240 } }}
    >
      <MenuItem component={Link} to={`/project/${projectId}/search/doc/${sdocId}`}>
        <ListItemIcon>
          <PlayCircleIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Open document</ListItemText>
      </MenuItem>
      <MenuItem component={Link} to={`/project/${projectId}/annotation/${sdocId}`} onClick={handleClose}>
        <ListItemIcon>
          <BorderColorIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Annotate document</ListItemText>
      </MenuItem>
      <MemoMenuItem onClick={handleClose} sdocId={sdocId} />
      <TagMenuListButtton popoverOrigin={{ vertical: "top", horizontal: "right" }} />
    </Menu>
  );
}

export default DocumentExplorerContextMenu;
