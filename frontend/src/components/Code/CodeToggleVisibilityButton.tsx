import { IconButton, IconButtonProps } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import React, { memo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import { AnnoActions, isHiddenCodeId } from "../../views/annotation/annoSlice.ts";
import { IDataTree } from "../TreeExplorer/IDataTree.ts";
import { flatTree } from "../TreeExplorer/TreeUtils.ts";

function CodeToggleVisibilityButton({ code, ...props }: IconButtonProps & { code: IDataTree }) {
  // redux (global client state)
  const isCodeHidden = useAppSelector(isHiddenCodeId(code.data.id));
  const dispatch = useAppDispatch();

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      event.stopPropagation();
      // toggle visibility of the code and all its children
      const codeIds = [code.data.id];
      if (code.children) {
        codeIds.push(...flatTree(code).map((c) => c.id));
      }
      dispatch(AnnoActions.toggleCodeVisibility(codeIds));
    },
    [code, dispatch],
  );

  return (
    <Tooltip title={isCodeHidden ? "Show code" : "Hide code"}>
      <span>
        <IconButton onClick={handleClick} {...props}>
          {getIconComponent(isCodeHidden ? Icon.VISIBILITY_OFF : Icon.VISIBILITY)}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default memo(CodeToggleVisibilityButton);
