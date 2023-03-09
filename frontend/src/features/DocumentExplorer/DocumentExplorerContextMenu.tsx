import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import React from "react";
import BorderColorIcon from "@mui/icons-material/BorderColor";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Link } from "react-router-dom";
import { ContextMenuProps } from "../../components/ContextMenu/ContextMenuProps";
import TagMenuMenuItem from "../../views/search/ToolBar/ToolBarElements/TagMenuMenuItem";
import MemoMenuItem from "../Memo/MemoMenuItem";
import { AttachedObjectType } from "../../api/openapi";
import DeleteMenuItem from "../../views/search/ToolBar/ToolBarElements/DeleteMenuItem";

// todo: refactor, this is basically the same as SearchResultContextMenu
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
      <MemoMenuItem
        onClick={handleClose}
        attachedObjectId={sdocId}
        attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT}
      />
      <TagMenuMenuItem popoverOrigin={{ vertical: "top", horizontal: "right" }} />
      <DeleteMenuItem onClick={handleClose} sdocId={sdocId} />
    </Menu>
  );
}

export default DocumentExplorerContextMenu;
