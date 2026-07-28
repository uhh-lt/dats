import { Icon, getIconComponent } from "@components/icons";
import { ITree } from "@components/tree-explorer";
import { MemoMenuItem } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { CodeReadWithParent } from "../../codeTypes";
import { CodeHistoryDialog } from "../../history/CodeHistoryDialog";
import { CodeHistoryMenuItem } from "../../history/CodeHistoryMenuItem";
import { IconButton, Menu } from "@mui/material";
import { useCallback, useState } from "react";
import { CodeEditMenuItem } from "./CodeEditMenuItem";
import { CodeToggleVisibilityMenuItem } from "./CodeToggleVisibilityMenuItem";

interface CodeExplorerActionMenuProps {
  node: ITree<CodeReadWithParent>;
  isHidden: boolean;
  onToggleVisibility: (codeIds: number[]) => void;
}

export function CodeExplorerActionMenu({ node, isHidden, onToggleVisibility }: CodeExplorerActionMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <>
      <IconButton onClick={handleClick}>{getIconComponent(Icon.CONTEXT_MENU)}</IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <CodeToggleVisibilityMenuItem
          code={node}
          isHidden={isHidden}
          onToggleVisibility={onToggleVisibility}
          onClick={handleClose}
        />
        <CodeEditMenuItem code={node.data} onClick={handleClose} />
        <CodeHistoryMenuItem
          onClick={() => {
            handleClose();
            setHistoryOpen(true);
          }}
        />
        <MemoMenuItem
          attachedObjectId={node.data.id}
          attachedObjectType={AttachedObjectType.CODE}
          onClick={handleClose}
        />
      </Menu>
      <CodeHistoryDialog code={node.data} open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
