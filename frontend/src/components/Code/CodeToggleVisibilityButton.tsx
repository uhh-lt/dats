import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { IconButton, IconButtonProps } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import React from "react";
import { IDataTree } from "../../features/TreeExplorer/IDataTree.ts";
import { flatTree } from "../../features/TreeExplorer/TreeUtils.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { AnnoActions, isHiddenCodeId } from "../../views/annotation/annoSlice.ts";

function CodeToggleVisibilityButton({ code, ...props }: IconButtonProps & { code: IDataTree }) {
  // redux (global client state)
  const isHidden = useAppSelector(isHiddenCodeId(code.data.id));
  const dispatch = useAppDispatch();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    // toggle visibility of the code and all its children
    const codeIds = [code.data.id];
    if (code.children) {
      codeIds.push(...flatTree(code).map((c) => c.id));
    }
    dispatch(AnnoActions.toggleCodeVisibility(codeIds));
  };

  return (
    <Tooltip title="Show/hide code">
      <IconButton onClick={handleClick} {...props}>
        {!isHidden ? <VisibilityIcon /> : <VisibilityOffIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default CodeToggleVisibilityButton;
