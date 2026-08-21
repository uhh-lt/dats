import { ListItemButton, ListItemText, Typography } from "@mui/material";
import { ReactNode } from "react";

interface MenuGridButtonProps {
  icon: ReactNode;
  label: string;
  selected?: boolean;
  onClick: () => void;
}

/** A single icon+label button for grid-style menus. */
export function MenuGridButton({ icon, label, selected = false, onClick }: MenuGridButtonProps) {
  return (
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{
        minWidth: 0,
        height: "100%",
        py: 1,
        flexDirection: "column",
        justifyContent: "center",
        gap: 0.5,
      }}
    >
      {icon}
      <ListItemText
        sx={{ m: 0, width: "100%" }}
        primary={
          <Typography
            component="span"
            variant="body2"
            textAlign="center"
            lineHeight={1.2}
            sx={{ display: "block", width: "100%" }}
          >
            {label}
          </Typography>
        }
      />
    </ListItemButton>
  );
}
