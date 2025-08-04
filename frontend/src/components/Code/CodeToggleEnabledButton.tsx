import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import { IconButton, IconButtonProps } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import React, { memo, useCallback } from "react";
import CodeHooks from "../../api/CodeHooks.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { ITree } from "../TreeExplorer/ITree.ts";

function CodeToggleEnabledButton({ code, ...props }: IconButtonProps & { code: ITree<CodeRead> | null | undefined }) {
  const isDisabled = (code?.data as CodeRead).enabled === false;
  const updateCodeMutation = CodeHooks.useUpdateCode();

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      event.stopPropagation();
      if (!code) return;
      updateCodeMutation.mutate({
        codeId: code.data.id,
        requestBody: {
          enabled: !(code.data as CodeRead).enabled,
        },
      });
    },
    [code, updateCodeMutation],
  );

  return (
    <Tooltip title={isDisabled ? "Enable code project-wide" : "Disable code project-wide"}>
      <span>
        <IconButton onClick={handleClick} {...props} disabled={!code || updateCodeMutation.isPending}>
          {!isDisabled ? <ToggleOnIcon /> : <ToggleOffIcon />}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default memo(CodeToggleEnabledButton);
