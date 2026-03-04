import { CodeRead } from "@api/models/CodeRead";
import { flatTree, ITree } from "@components/tree-explorer";
import { AnnoActions, isHiddenCodeId } from "@features/annotation/store/annoSlice";
import { IconButton, IconButtonProps } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { getIconComponent, Icon } from "@utils/icons/iconUtils";
import { memo, MouseEventHandler, useCallback } from "react";

export const CodeToggleVisibilityButton = memo(({ code, ...props }: IconButtonProps & { code: ITree<CodeRead> }) => {
  // redux (global client state)
  const isCodeHidden = useAppSelector(isHiddenCodeId(code.data.id));
  const dispatch = useAppDispatch();

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
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
});
