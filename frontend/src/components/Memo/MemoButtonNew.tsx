import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { memo, useCallback } from "react";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import { MemoCreateSuccessHandler } from "./MemoDialog/MemoDialogAPI.ts";

interface MemoButtonNewProps {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  memoIds: number[];
  attachedObjectType: AttachedObjectType;
  attachedObjectId: number;
  onCreateSuccess?: MemoCreateSuccessHandler;
}

function MemoButtonNew({
  onClick,
  memoIds,
  attachedObjectType,
  attachedObjectId,
  onCreateSuccess,
  ...props
}: MemoButtonNewProps & IconButtonProps) {
  const dispatch = useAppDispatch();
  const handleClickOpen = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onClick(event);
      dispatch(
        CRUDDialogActions.openMemoDialog({
          memoIds,
          attachedObjectId,
          attachedObjectType,
          onMemoCreateSuccess: onCreateSuccess,
        }),
      );
    },
    [attachedObjectId, attachedObjectType, dispatch, memoIds, onClick, onCreateSuccess],
  );
  return (
    <Tooltip title="Memo">
      <span>
        <IconButton onClick={handleClickOpen} {...(props as IconButtonProps)}>
          {getIconComponent(Icon.MEMO)}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default memo(MemoButtonNew);
