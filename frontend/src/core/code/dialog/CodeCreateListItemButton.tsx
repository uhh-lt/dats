import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { memo, useCallback } from "react";
import { UIDialogActions } from "../../../store/global/dialogSlice";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils";

interface CodeCreateListItemButtonProps {
  parentCodeId: number | undefined;
}

export const CodeCreateListItemButton = memo(
  ({ parentCodeId, ...props }: CodeCreateListItemButtonProps & Omit<ListItemButtonProps, "onClick">) => {
    // global client state (redux)
    const dispatch = useAppDispatch();

    const handleClick = useCallback(() => {
      dispatch(UIDialogActions.openCodeCreateDialog({ parentCodeId }));
    }, [dispatch, parentCodeId]);

    return (
      <ListItemButton {...props} onClick={handleClick}>
        <ListItemIcon>{getIconComponent(Icon.CREATE)}</ListItemIcon>
        <ListItemText primary="Create new code" />
      </ListItemButton>
    );
  },
);
