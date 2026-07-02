import { CodeRead } from "@api/models/CodeRead";
import { getIconComponent, Icon } from "@components/icons";
import { flatTree, ITree } from "@components/tree-explorer";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo, MouseEventHandler, useCallback } from "react";

interface CodeToggleVisibilityMenuItemProps {
  code: ITree<CodeRead>;
  isHidden: boolean;
  onToggleVisibility: (codeIds: number[]) => void;
}

export const CodeToggleVisibilityMenuItem = memo(
  ({ code, isHidden, onToggleVisibility, ...props }: CodeToggleVisibilityMenuItemProps & MenuItemProps) => {
    const handleClick: MouseEventHandler = useCallback(
      (event) => {
        event.stopPropagation();
        // toggle visibility of the code and all its children
        const codeIds = [code.data.id];
        if (code.children) {
          codeIds.push(...flatTree(code).map((c) => c.id));
        }
        onToggleVisibility(codeIds);
      },
      [code, onToggleVisibility],
    );

    return (
      <MenuItem onClick={handleClick} {...props}>
        <ListItemIcon>
          {getIconComponent(isHidden ? Icon.VISIBILITY_OFF : Icon.VISIBILITY, { fontSize: "small" })}
        </ListItemIcon>
        <ListItemText>{isHidden ? "Show code" : "Hide code"}</ListItemText>
      </MenuItem>
    );
  },
);
