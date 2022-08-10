import { IconButton, IconButtonProps } from "@mui/material";
import React from "react";
import Tooltip from "@mui/material/Tooltip";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ICodeTree from "./ICodeTree";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { flatTree } from "./TreeUtils";
import { AnnoActions, isHiddenCodeId } from "../annoSlice";

function CodeToggleVisibilityButton({ code, ...props }: IconButtonProps & { code: ICodeTree }) {
  // redux (global client state)
  const isHidden = useAppSelector(isHiddenCodeId(code.code.id));
  const dispatch = useAppDispatch();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    // toggle visibility of the code and all its children
    const codeIds = [code.code.id];
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
