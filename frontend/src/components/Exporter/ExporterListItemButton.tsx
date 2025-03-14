import { ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { useCallback } from "react";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import ExporterAPI from "./ExporterAPI.ts";

function ExporterListItemButton() {
  const handleClick = useCallback(() => {
    ExporterAPI.openExporterDialog({ type: "Project", sdocId: -1, singleUser: false, users: [] });
  }, []);

  return (
    <ListItem disablePadding>
      <ListItemButton onClick={handleClick}>
        <ListItemIcon>{getIconComponent(Icon.EXPORT)}</ListItemIcon>
        <ListItemText primary="Export" />
      </ListItemButton>
    </ListItem>
  );
}

export default ExporterListItemButton;
