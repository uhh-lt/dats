import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { Link } from "react-router-dom";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { ContextMenuPosition } from "../../../components/ContextMenu/ContextMenuPosition.ts";
import MemoMenuItem from "../../../features/Memo/MemoMenuItem.tsx";
import DeleteMenuItem from "../ToolBar/ToolBarElements/DeleteMenuItem.tsx";
import TagMenuMenuItem from "../ToolBar/ToolBarElements/TagMenu/TagMenuMenuItem.tsx";

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
      <MenuItem component={Link} to={`/project/${projectId}/annotation/${sdocId}`} onClick={handleClose}>
        <ListItemIcon>
          <PlayCircleIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Open document</ListItemText>
      </MenuItem>
      <MemoMenuItem
        onClick={handleClose}
        attachedObjectId={sdocId}
        attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT}
      />
      <TagMenuMenuItem popoverOrigin={{ vertical: "top", horizontal: "right" }} />
      <DeleteMenuItem onClick={handleClose} sdocId={sdocId} navigateTo="../search" />
    </Menu>
  );
}

export default SearchResultContextMenu;
