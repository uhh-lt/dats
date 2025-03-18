import { IconButton, Menu } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import MemoMenuItem from "../../Memo/MemoMenuItem.tsx";
import { DataTreeActionRendererProps } from "../../TreeExplorer/DataTreeView.tsx";
import TagEditMenuItem from "./TagEditMenuItem.tsx";

function TagExplorerActionMenu({ node: tag }: DataTreeActionRendererProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback((event: React.MouseEvent<HTMLLIElement>) => {
    event.stopPropagation();
    setAnchorEl(null);
  }, []);

  return (
    <>
      <IconButton onClick={handleClick}>{getIconComponent(Icon.CONTEXT_MENU)}</IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <TagEditMenuItem tag={tag.data} onClick={handleClose} />
        <MemoMenuItem
          attachedObjectId={tag.data.id}
          attachedObjectType={AttachedObjectType.DOCUMENT_TAG}
          onClick={handleClose}
        />
      </Menu>
    </>
  );
}

export default memo(TagExplorerActionMenu);
