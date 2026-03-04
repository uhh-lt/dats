import { TagRead } from "@api/models/TagRead";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { UIDialogActions } from "@store/global/dialogSlice";
import { getIconComponent, Icon } from "@utils/icons/iconUtils";
import { memo, MouseEventHandler, useCallback } from "react";

export const TagEditButton = memo(({ tag, ...props }: IconButtonProps & { tag: TagRead }) => {
  const dispatch = useAppDispatch();

  const handleClickOpen: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.stopPropagation();
      dispatch(UIDialogActions.openTagEditDialog({ tag }));
    },
    [dispatch, tag],
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
