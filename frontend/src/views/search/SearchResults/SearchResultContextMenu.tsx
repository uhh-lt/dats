import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import React from "react";
import TagMenuListButtton from "./TagMenuListButtton";
import { ContextMenuPosition } from "../../projects/ProjectContextMenu2";
import BorderColorIcon from "@mui/icons-material/BorderColor";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Link } from "react-router-dom";
import MemoMenuItem from "../../../features/memo-dialog/MemoMenuItem";
import { AttachedObjectType } from "../../../api/openapi";

interface SearchResultContextMenuProps {
  position: ContextMenuPosition | null;
  projectId: number;
  sdocId: number | undefined;
  handleClose: () => void;
}

function SearchResultContextMenu({ position, projectId, sdocId, handleClose }: SearchResultContextMenuProps) {
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
      <MenuItem component={Link} to={`/project/${projectId}/search/doc/${sdocId}`} onClick={handleClose}>
        <ListItemIcon>
          <PlayCircleIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Open document</ListItemText>
      </MenuItem>
      <MenuItem component={Link} to={`/project/${projectId}/annotation/${sdocId}`}>
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
      <TagMenuListButtton popoverOrigin={{ vertical: "top", horizontal: "right" }} />
    </Menu>
  );
}

export default SearchResultContextMenu;
