import { getIconComponent, Icon } from "@components/icons";
import { flatTree, ITree } from "@components/tree-explorer";
import { CodeRead } from "@models/CodeRead";
import { IconButton, IconButtonProps } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import { memo, MouseEventHandler, useCallback } from "react";

interface CodeToggleVisibilityButtonProps extends IconButtonProps {
  code: ITree<CodeRead>;
  isHidden: boolean;
  onToggleVisibility: (codeIds: number[]) => void;
}

export const CodeToggleVisibilityButton = memo(
  ({ code, isHidden, onToggleVisibility, ...props }: CodeToggleVisibilityButtonProps) => {
    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
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
      <Tooltip title={isHidden ? "Show code" : "Hide code"}>
        <span>
          <IconButton onClick={handleClick} {...props}>
            {getIconComponent(isHidden ? Icon.VISIBILITY_OFF : Icon.VISIBILITY)}
          </IconButton>
        </span>
      </Tooltip>
    );
  },
);
