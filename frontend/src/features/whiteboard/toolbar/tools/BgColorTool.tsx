import { Box, Button, Menu, Slider, Stack, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { ColorGrid } from "./ColorGrid.tsx";

// Convert hex color to rgba for the icon background
const computeBackgroundColor = (color: string, alpha: number | null) => {
  // If it's already an rgba color, return it
  if (color.startsWith("rgba")) return color;

  // Convert hex to rgba
  try {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const alphaValue = alpha ? alpha / 255 : 1; // Convert alpha from 0-255 to 0-1 range

    return `rgba(${r}, ${g}, ${b}, ${alphaValue})`;
  } catch (error) {
    console.error("Error converting color:", error);
    return "transparent";
  }
};

interface BgColorToolProps {
  color: string;
  alpha: number | null;
  onColorChange: (color: string) => void;
  onAlphaChange: (value: number) => void;
}

export function BgColorTool({ color, alpha, onColorChange, onAlphaChange }: BgColorToolProps) {
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
      <Tooltip title="Background color" arrow>
        <Button
          size="small"
          onClick={handleClick}
          sx={{
            minWidth: 0,
            width: 28,
            height: 28,
            p: 0,
            borderRadius: "50%",
            bgcolor: computeBackgroundColor(color, alpha),
            border: "1px solid rgba(0, 0, 0, 0.12)",
            "&:hover": {
              bgcolor: computeBackgroundColor(color, alpha),
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
            padding: 0,
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
        <Stack direction="column" spacing={1} sx={{ p: 1, minWidth: 160 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Opacity
          </Typography>
          <Box sx={{ px: 1 }}>
            <Slider
              size="small"
              defaultValue={alpha || 1}
              step={1}
              min={0}
              max={255}
              onChangeCommitted={(_event, newValue) => onAlphaChange(newValue as number)}
            />
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Color
          </Typography>
          <ColorGrid selectedColor={color} onColorChange={onColorChange} />
        </Stack>
      </Menu>
    </Box>
  );
}
