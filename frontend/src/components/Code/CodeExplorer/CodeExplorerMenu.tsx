import { IconButton, IconButtonProps, Menu } from "@mui/material";
import { useState } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import MemoMenuItem from "../../Memo/MemoMenuItem.tsx";
import { IDataTree } from "../../TreeExplorer/IDataTree.ts";
import CodeEditMenuItem from "./CodeEditMenuItem.tsx";
import CodeToggleVisibilityMenuItem from "./CodeToggleVisibilityMenuItem.tsx";

interface CodeExplorerMenuPops {
  code: IDataTree;
}

function CodeExplorerMenu({ code, ...props }: CodeExplorerMenuPops & Omit<IconButtonProps, "onClick">) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton onClick={handleClick} {...(props as IconButtonProps)}>
        {getIconComponent(Icon.CONTEXT_MENU)}
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <CodeToggleVisibilityMenuItem code={code} onClick={handleClose} />
        <CodeEditMenuItem code={code.data as CodeRead} onClick={handleClose} />
        <MemoMenuItem
          attachedObjectId={code.data.id}
          attachedObjectType={AttachedObjectType.CODE}
          onClick={handleClose}
        />
      </Menu>
    </>
  );
}

export default CodeExplorerMenu;
