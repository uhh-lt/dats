import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { memo, MouseEventHandler, useCallback } from "react";
import { TagRead } from "../../../api/openapi/models/TagRead.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../store/dialogSlice.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";

export const TagEditButton = memo(({ tag, ...props }: IconButtonProps & { tag: TagRead }) => {
  const dispatch = useAppDispatch();

  const handleClickOpen: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.stopPropagation();
      dispatch(CRUDDialogActions.openTagEditDialog({ tag }));
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
