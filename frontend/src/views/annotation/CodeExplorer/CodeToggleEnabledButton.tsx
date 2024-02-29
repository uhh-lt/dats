import { IconButton, IconButtonProps } from "@mui/material";
import React from "react";
import Tooltip from "@mui/material/Tooltip";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ICodeTree from "./ICodeTree.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { flatTree } from "./TreeUtils.ts";
import { SettingsActions } from "../../settings/settingsSlice.ts";
import { RootState } from "../../../store/store.ts";

function CodeToggleEnabledButton({ code, ...props }: IconButtonProps & { code: ICodeTree | null | undefined }) {
  // redux (global client state)
  const isDisabled = useAppSelector((state: RootState) =>
    code ? state.settings.disabledCodeIds.indexOf(code.code.id) !== -1 : false,
  );
  const dispatch = useAppDispatch();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();

    if (!code) return;

    // toggle visibility of the code and all its children
    const codeIds = [code.code.id];
    if (code.children) {
      codeIds.push(...flatTree(code).map((c) => c.id));
    }
    dispatch(SettingsActions.toggleCodeDisabled(codeIds));
  };

  return (
    <Tooltip title={isDisabled ? "Enable code project-wide" : "Disable code project-wide"}>
      <span>
        <IconButton onClick={handleClick} {...props} disabled={!code}>
          {!isDisabled ? <ToggleOnIcon /> : <ToggleOffIcon />}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default CodeToggleEnabledButton;
