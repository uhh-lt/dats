import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ICodeTree from "./ICodeTree.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { flatTree } from "./TreeUtils.ts";
import { AnnoActions } from "../annoSlice.ts";

interface CodeToggleVisibilityMenuItemProps {
  code: ICodeTree;
  onClick?: () => void;
}

function CodeToggleVisibilityMenuItem({ code, onClick, ...props }: CodeToggleVisibilityMenuItemProps & MenuItemProps) {
  // redux (global client state)
  const dispatch = useAppDispatch();
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    // toggle visibility of the code and all its children
    const codeIds = [code.code.id];
    if (code.children) {
      codeIds.push(...flatTree(code).map((c) => c.id));
    }
    dispatch(AnnoActions.toggleCodeVisibility(codeIds));
    if (onClick) onClick();
  };

  return (
    <MenuItem onClick={handleClick} {...props}>
      <ListItemIcon>
        <VisibilityIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Toggle code visibility</ListItemText>
    </MenuItem>
  );
}

export default CodeToggleVisibilityMenuItem;
