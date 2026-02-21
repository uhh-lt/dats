import { IconButton, IconButtonProps } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import { memo, MouseEventHandler, useCallback } from "react";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { ITree } from "../../components/TreeExplorer/ITree.ts";
import { flatTree } from "../../components/TreeExplorer/TreeUtils.ts";
import { AnnoActions, isHiddenCodeId } from "../../features/annotation/annoSlice.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";

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
