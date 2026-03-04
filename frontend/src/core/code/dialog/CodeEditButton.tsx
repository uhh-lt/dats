import { CodeRead } from "@api/models/CodeRead";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { UIDialogActions } from "@store/global/dialogSlice";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";
import { MouseEventHandler, memo, useCallback } from "react";

export const CodeEditButton = memo(({ code, ...props }: IconButtonProps & { code: CodeRead }) => {
  const dispatch = useAppDispatch();

  const handleClickOpen: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.stopPropagation();
      dispatch(UIDialogActions.openCodeEditDialog({ code }));
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
