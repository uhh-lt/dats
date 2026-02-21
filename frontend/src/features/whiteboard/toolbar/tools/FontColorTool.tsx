import { Box, Button, Menu, Tooltip } from "@mui/material";
import { useState } from "react";
import { ColorGrid } from "./ColorGrid.tsx";

interface FontColorToolProps {
  color: string;
  onColorChange: (color: string) => void;
}

export function FontColorTool({ color, onColorChange }: FontColorToolProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Tooltip title="Font color" arrow disableHoverListener={Boolean(anchorEl)}>
        <Button
          size="small"
          onClick={handleClick}
          sx={{
            minWidth: 0,
            width: 28,
            height: 28,
            p: 0,
            borderRadius: "50%",
            bgcolor: color,
            border: "1px solid rgba(0, 0, 0, 0.12)",
            "&:hover": {
              bgcolor: color,
              opacity: 0.8,
            },
          }}
        />
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        sx={{
          "& .MuiPaper-root": {
            padding: 1,
            margin: 0,
            marginTop: "19px",
            elevation: 1,
            boxShadow: 1,
            width: 160,
          },
          "& .MuiList-root": {
            padding: 0,
          },
        }}
      >
        <ColorGrid selectedColor={color} onColorChange={onColorChange} />
      </Menu>
    </Box>
  );
}
