import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import React, { memo, useCallback } from "react";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";

function CodeEditButton({ code, ...props }: IconButtonProps & { code: CodeRead }) {
  const dispatch = useAppDispatch();

  const handleClickOpen = useCallback(
    (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      event.stopPropagation();
      dispatch(CRUDDialogActions.openCodeEditDialog({ code }));
    },
    [dispatch, code],
  );

  return (
    <Tooltip title="Edit code">
      <span>
        <IconButton onClick={handleClickOpen} {...props}>
          {getIconComponent(Icon.EDIT)}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default memo(CodeEditButton);
