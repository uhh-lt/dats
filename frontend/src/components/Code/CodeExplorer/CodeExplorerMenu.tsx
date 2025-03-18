import { IconButton, Menu } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import MemoMenuItem from "../../Memo/MemoMenuItem.tsx";
import { IDataTree } from "../../TreeExplorer/IDataTree.ts";
import CodeEditMenuItem from "./CodeEditMenuItem.tsx";
import CodeToggleVisibilityMenuItem from "./CodeToggleVisibilityMenuItem.tsx";

function CodeExplorerMenu(code: IDataTree) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <>
      <IconButton onClick={handleClick}>{getIconComponent(Icon.CONTEXT_MENU)}</IconButton>
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

export default memo(CodeExplorerMenu);
