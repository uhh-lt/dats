import HistoryIcon from "@mui/icons-material/History";
import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";

interface CodeHistoryMenuItemProps {
  onClick: () => void;
}

export function CodeHistoryMenuItem({ onClick }: CodeHistoryMenuItemProps) {
  return (
    <MenuItem onClick={onClick}>
      <ListItemIcon>
        <HistoryIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Show change history</ListItemText>
    </MenuItem>
  );
}
