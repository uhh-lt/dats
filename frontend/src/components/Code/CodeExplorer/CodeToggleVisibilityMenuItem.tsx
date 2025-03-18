import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React, { memo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import { AnnoActions, isHiddenCodeId } from "../../../views/annotation/annoSlice.ts";
import { IDataTree } from "../../TreeExplorer/IDataTree.ts";
import { flatTree } from "../../TreeExplorer/TreeUtils.ts";

interface CodeToggleVisibilityMenuItemProps {
  code: IDataTree;
  onClick?: () => void;
}

function CodeToggleVisibilityMenuItem({ code, onClick, ...props }: CodeToggleVisibilityMenuItemProps & MenuItemProps) {
  // redux (global client state)
  const isCodeHidden = useAppSelector(isHiddenCodeId(code.data.id));
  const dispatch = useAppDispatch();

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      // toggle visibility of the code and all its children
      const codeIds = [code.data.id];
      if (code.children) {
        codeIds.push(...flatTree(code).map((c) => c.id));
      }
      dispatch(AnnoActions.toggleCodeVisibility(codeIds));
      if (onClick) onClick();
    },
    [code, dispatch, onClick],
  );

  return (
    <MenuItem onClick={handleClick} {...props}>
      <ListItemIcon>
        {getIconComponent(isCodeHidden ? Icon.VISIBILITY_OFF : Icon.VISIBILITY, { fontSize: "small" })}
      </ListItemIcon>
      <ListItemText>{isCodeHidden ? "Show code" : "Hide code"}</ListItemText>
    </MenuItem>
  );
}

export default memo(CodeToggleVisibilityMenuItem);
