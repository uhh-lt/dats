import { IconButton, IconButtonProps } from "@mui/material";
import React from "react";
import Tooltip from "@mui/material/Tooltip";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ICodeTree from "./ICodeTree";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { flatTree } from "./TreeUtils";
import { SettingsActions } from "../../settings/settingsSlice";
import { RootState } from "../../../store/store";

function CodeToggleEnabledButton({ code, ...props }: IconButtonProps & { code: ICodeTree | null | undefined }) {
  // redux (global client state)
  const isDisabled = useAppSelector((state: RootState) =>
    code ? state.settings.disabledCodeIds.indexOf(code.code.id) !== -1 : false
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
    <Tooltip title="Enable/disable code project-wide">
      <span>
        <IconButton onClick={handleClick} {...props} disabled={!code}>
          {!isDisabled ? <VisibilityIcon /> : <VisibilityOffIcon />}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default CodeToggleEnabledButton;
