import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import React, { memo, useCallback } from "react";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";

function TagEditButton({ tag, ...props }: IconButtonProps & { tag: DocumentTagRead }) {
  const dispatch = useAppDispatch();

  const handleClickOpen = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
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
}

export default memo(TagEditButton);
