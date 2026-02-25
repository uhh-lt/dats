import { flatTree, ITree } from "@components/tree-explorer";
import { IconButton, IconButtonProps } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { memo, MouseEventHandler, useCallback } from "react";
import { CodeRead } from "../../api/openapi/models/CodeRead";
import { AnnoActions, isHiddenCodeId } from "../../features/annotation/store/annoSlice";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils";

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
