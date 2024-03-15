import { Menu } from "@mui/material";
import React from "react";
import { AttachedObjectType } from "../../api/openapi";
import { ContextMenuProps } from "../../components/ContextMenu/ContextMenuProps";
import MemoMenuItem from "../Memo/MemoMenuItem";
import DataEditMenuItem from "./DataEditMenuItem";
import { IDataTree } from "./IDataTree";
import { KEYWORD_TAGS } from "../../utils/GlobalConstants";

interface DataExplorerContextMenuProps extends ContextMenuProps {
  node: IDataTree | undefined;
  dataType: string;
}

function DataExplorerContextMenu({ position, handleClose, node, dataType }: DataExplorerContextMenuProps) {
  if (!node) return null;
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
      PaperProps={{ sx: { width: 240, maxHeight: 300 } }}
    >
      <DataEditMenuItem data={node.data} onClick={handleClose} dataType={dataType} />
      <MemoMenuItem
        attachedObjectId={node.data.id}
        attachedObjectType={dataType === KEYWORD_TAGS ? AttachedObjectType.DOCUMENT_TAG : AttachedObjectType.CODE}
        onClick={handleClose}
      />
    </Menu>
  );
}

export default DataExplorerContextMenu;
