import { ITree } from "@components/tree-explorer";
import { MemoMenuItem } from "@core/memo/dialog";
import { IconButton, Menu } from "@mui/material";
import { useCallback, useState } from "react";
import { AttachedObjectType } from "../../../../api/openapi/models/AttachedObjectType";
import { TagRead } from "../../../../api/openapi/models/TagRead";
import { Icon, getIconComponent } from "../../../../utils/icons/iconUtils";
import { TagEditMenuItem } from "./TagEditMenuItem";

interface TagExplorerActionMenuProps {
  node: ITree<TagRead>;
}

export function TagExplorerActionMenu({ node }: TagExplorerActionMenuProps) {
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
        <TagEditMenuItem tag={node.data} onClick={handleClose} />
        <MemoMenuItem
          attachedObjectId={node.data.id}
          attachedObjectType={AttachedObjectType.TAG}
          onClick={handleClose}
        />
      </Menu>
    </>
  );
}
