import { CodeRead } from "@api/models/CodeRead";
import { Icon, getIconComponent } from "@components/icons";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { MouseEventHandler, memo, useCallback } from "react";

export const CodeEditButton = memo(({ code, ...props }: IconButtonProps & { code: CodeRead }) => {
  const openCodeEditDialog = useOpenDialog("codeEdit");

  const handleClickOpen: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.stopPropagation();
      openCodeEditDialog({ code });
    },
    [openCodeEditDialog, code],
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
