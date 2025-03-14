import { IconButton, IconButtonProps, Menu } from "@mui/material";
import { useState } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import MemoMenuItem from "../../Memo/MemoMenuItem.tsx";
import { IDataTree } from "../../TreeExplorer/IDataTree.ts";
import TagEditMenuItem from "./TagEditMenuItem.tsx";

interface TagExplorerMenuProps {
  tag: IDataTree;
}

function TagExplorerMenu({ tag, ...props }: TagExplorerMenuProps & Omit<IconButtonProps, "onClick">) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const handleClose: React.MouseEventHandler<HTMLLIElement> = (event) => {
    event.stopPropagation();
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton onClick={handleClick} {...(props as IconButtonProps)}>
        {getIconComponent(Icon.CONTEXT_MENU)}
      </IconButton>
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

export default TagExplorerMenu;
