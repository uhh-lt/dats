import { ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { useCallback } from "react";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../store/dialogSlice.ts";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";

export function ProjectSettingsListItemButton() {
  const dispatch = useAppDispatch();
  const handleClick = useCallback(() => {
    dispatch(CRUDDialogActions.openProjectSettings());
  }, [dispatch]);

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton onClick={handleClick}>
          <ListItemIcon>{getIconComponent(Icon.SETTINGS)}</ListItemIcon>
          <ListItemText primary="Project Settings" />
        </ListItemButton>
      </ListItem>
    </>
  );
}
