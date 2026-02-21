import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { memo, useCallback } from "react";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../store/dialogSlice.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";

interface CodeCreateListItemButtonProps {
  parentCodeId: number | undefined;
}

export const CodeCreateListItemButton = memo(
  ({ parentCodeId, ...props }: CodeCreateListItemButtonProps & Omit<ListItemButtonProps, "onClick">) => {
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
  },
);
