import { ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import ExporterAPI from "./ExporterAPI.ts";
import { useCallback } from "react";

function ExporterListItemButton() {
  const handleClick = useCallback(() => {
    ExporterAPI.openExporterDialog({ type: "Project", sdocId: -1, singleUser: false, users: [] });
  }, []);

  return (
    <ListItem disablePadding>
      <ListItemButton onClick={handleClick}>
        <ListItemIcon>
          <SaveAltIcon />
        </ListItemIcon>
        <ListItemText primary="Export" />
      </ListItemButton>
    </ListItem>
  );
}

export default ExporterListItemButton;
