import { ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { useCallback } from "react";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";

function ProjectSettingsListItemButton() {
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

export default ProjectSettingsListItemButton;
