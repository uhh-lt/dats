import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { memo, useCallback } from "react";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import { MemoCreateSuccessHandler } from "./MemoDialog/MemoDialogAPI.ts";

interface MemoMenuItemProps {
  onClick: React.MouseEventHandler<HTMLLIElement>;
  memoIds: number[];
  attachedObjectType: AttachedObjectType;
  attachedObjectId: number;
  onCreateSuccess?: MemoCreateSuccessHandler;
}

function MemoMenuItemNew({
  memoIds,
  attachedObjectId,
  attachedObjectType,
  onCreateSuccess,
  onClick,
}: MemoMenuItemProps) {
  const dispatch = useAppDispatch();
  const handleClickOpen = useCallback(
    (event: React.MouseEvent<HTMLLIElement>) => {
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
    <MenuItem onClick={handleClickOpen}>
      <ListItemIcon>{getIconComponent(Icon.MEMO, { fontSize: "small" })}</ListItemIcon>
      <ListItemText>Memo</ListItemText>
    </MenuItem>
  );
}

export default memo(MemoMenuItemNew);
