import { TagRead } from "@api/models/TagRead";
import { getIconComponent, Icon } from "@components/icons";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { memo, MouseEventHandler, useCallback } from "react";

export const TagEditButton = memo(({ tag, ...props }: IconButtonProps & { tag: TagRead }) => {
  const openTagEditDialog = useOpenDialog("tagEdit");

  const handleClickOpen: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.stopPropagation();
      openTagEditDialog({ tag });
    },
    [openTagEditDialog, tag],
  );

  return (
    <Tooltip title="Edit tag">
      <span>
        <IconButton onClick={handleClickOpen} {...props}>
          {getIconComponent(Icon.EDIT)}
        </IconButton>
      </span>
    </Tooltip>
  );
});
