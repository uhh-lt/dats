import { flatTree, ITree } from "@components/tree-explorer";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { memo, MouseEventHandler, useCallback } from "react";
import { CodeRead } from "../../../../api/openapi/models/CodeRead";
import { AnnoActions, isHiddenCodeId } from "../../../../features/annotation/store/annoSlice";
import { getIconComponent, Icon } from "../../../../utils/icons/iconUtils";

interface CodeToggleVisibilityMenuItemProps {
  code: ITree<CodeRead>;
  onClick?: () => void;
}

export const CodeToggleVisibilityMenuItem = memo(
  ({ code, onClick, ...props }: CodeToggleVisibilityMenuItemProps & MenuItemProps) => {
    // redux (global client state)
    const isCodeHidden = useAppSelector(isHiddenCodeId(code.data.id));
    const dispatch = useAppDispatch();

    const handleClick: MouseEventHandler = useCallback(
      (event) => {
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
  },
);
