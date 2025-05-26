import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { memo, useCallback } from "react";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";

interface CodeCreateListItemButtonProps {
  parentCodeId: number | undefined;
}

function CodeCreateListItemButton({
  parentCodeId,
  ...props
}: CodeCreateListItemButtonProps & Omit<ListItemButtonProps, "onClick">) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  const handleClick = useCallback(() => {
    dispatch(CRUDDialogActions.openCodeCreateDialog({ parentCodeId }));
  }, [dispatch, parentCodeId]);

  return (
    <ListItemButton {...props} onClick={handleClick}>
      <ListItemIcon>{getIconComponent(Icon.CREATE)}</ListItemIcon>
      <ListItemText primary="Create new code" />
    </ListItemButton>
  );
}

export default memo(CodeCreateListItemButton);
