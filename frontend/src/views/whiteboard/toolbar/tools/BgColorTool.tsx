import { Add as AddIcon } from "@mui/icons-material";
import { Box, Button, Grid2 as Grid, Menu, Slider, Stack, Tooltip, Typography } from "@mui/material";
import { useRef, useState } from "react";

interface BgColorToolProps {
  color: string;
  value: number | undefined;
  onColorChange: (color: string) => void;
  onValueChange: (value: number) => void;
}

// Predefined colors
const PREDEFINED_COLORS = [
  "#ffffff", // White
  "#000000", // Black
  "#ff0000", // Red
  "#00ff00", // Green
  "#0000ff", // Blue
  "#ffff00", // Yellow
  "#ff00ff", // Magenta
  "#00ffff", // Cyan
  "#808080", // Gray
  "#800000", // Maroon
  "#808000", // Olive
  "#008000", // Dark Green
  "#800080", // Purple
  "#008080", // Teal
  "#000080", // Navy
];

const BgColorTool: React.FC<BgColorToolProps> = ({ color, value = 1, onColorChange, onValueChange }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onColorChange(event.target.value);
  };

  const handlePredefinedColorClick = (predefinedColor: string) => {
    onColorChange(predefinedColor);
  };

  const handleAddColorClick = () => {
    colorInputRef.current?.click();
  };

  // Convert hex color to rgba for the icon background
  const getBackgroundColor = () => {
    if (!color) return "transparent";

    // If it's already an rgba color, return it
    if (color.startsWith("rgba")) return color;

    // Convert hex to rgba
    try {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      return `rgba(${r}, ${g}, ${b}, ${value})`;
    } catch (error) {
      console.error("Error converting color:", error);
      return "transparent";
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Tooltip title="Background color" arrow>
        <Button
          size="small"
          onClick={handleClick}
          sx={{
            mr: 1,
            minWidth: 0,
            width: 28,
            height: 28,
            p: 0,
            borderRadius: "50%",
            bgcolor: getBackgroundColor(),
            border: "1px solid rgba(0, 0, 0, 0.12)",
            "&:hover": {
              bgcolor: getBackgroundColor(),
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
            marginTop: 1.5,
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
          <Box sx={{ width: "100%" }}>
            <Typography variant="caption" sx={{ mb: 1, pl: 1 }}>
              Opacity
            </Typography>
            <Box sx={{ px: 1 }}>
              <Slider
                size="small"
                defaultValue={value}
                step={1}
                min={0}
                max={255}
                onChangeCommitted={(_event, newValue) => onValueChange(newValue as number)}
              />
            </Box>
          </Box>
          <Grid container spacing={1} columns={4} sx={{ justifyContent: "start" }}>
            {PREDEFINED_COLORS.map((predefinedColor) => (
              <Grid key={predefinedColor} size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center" }}>
                <Tooltip title={predefinedColor} arrow>
                  <Button
                    size="small"
                    onClick={() => handlePredefinedColorClick(predefinedColor)}
                    sx={{
                      minWidth: 0,
                      width: 24,
                      height: 24,
                      p: 0,
                      borderRadius: "50%",
                      bgcolor: predefinedColor,
                      border: "1px solid rgba(0, 0, 0, 0.12)",
                      "&:hover": {
                        bgcolor: predefinedColor,
                        opacity: 0.7,
                        transform: "scale(1.1)",
                      },
                      transition: (theme) => theme.transitions.create(["opacity", "transform", "background-color"]),
                    }}
                  />
                </Tooltip>
              </Grid>
            ))}
            <Grid size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center" }}>
              <Tooltip title="Add new color" arrow>
                <Box sx={{ position: "relative" }}>
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={color}
                    onChange={handleColorChange}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "24px",
                      height: "24px",
                      padding: 0,
                      border: "none",
                      opacity: 0,
                      cursor: "pointer",
                    }}
                  />
                  <Button
                    size="small"
                    onClick={handleAddColorClick}
                    sx={{
                      minWidth: 0,
                      width: 24,
                      height: 24,
                      p: 0,
                      borderRadius: "50%",
                      bgcolor: "background.paper",
                      border: "1px solid rgba(0, 0, 0, 0.12)",
                      "&:hover": {
                        bgcolor: "background.paper",
                        opacity: 0.7,
                        transform: "scale(1.1)",
                      },
                      transition: (theme) => theme.transitions.create(["opacity", "transform", "background-color"]),
                    }}
                  >
                    <AddIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                  </Button>
                </Box>
              </Tooltip>
            </Grid>
          </Grid>
        </Stack>
      </Menu>
    </Box>
  );
};

export default BgColorTool;
