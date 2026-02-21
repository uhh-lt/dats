import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { MouseEventHandler, memo, useCallback } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../store/dialogSlice.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";

export const CodeEditButton = memo(({ code, ...props }: IconButtonProps & { code: CodeRead }) => {
  const dispatch = useAppDispatch();

  const handleClickOpen: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
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
});
