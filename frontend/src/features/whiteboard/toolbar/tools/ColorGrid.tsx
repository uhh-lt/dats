import { Add as AddIcon } from "@mui/icons-material";
import { Box, Button, Grid2 as Grid, Stack, Tooltip } from "@mui/material";
import { useRef } from "react";
import { PREDEFINED_COLORS } from "../../whiteboardUtils.ts";

interface ColorGridProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  includeCustomColor?: boolean;
}

export const ColorGrid: React.FC<ColorGridProps> = ({ selectedColor, onColorChange, includeCustomColor = true }) => {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onColorChange(event.target.value);
  };

  const handlePredefinedColorClick = (predefinedColor: string) => {
    onColorChange(predefinedColor);
  };

  const handleAddColorClick = () => {
    colorInputRef.current?.click();
  };

  return (
    <Stack direction="column" spacing={1}>
      <Grid container spacing={1} columns={4} sx={{ justifyContent: "start" }}>
        {PREDEFINED_COLORS.map((predefinedColor) => (
          <Grid key={predefinedColor} size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center" }}>
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
                },
              }}
            />
          </Grid>
        ))}
        {includeCustomColor && (
          <Grid size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center" }}>
            <Tooltip title="Add new color" arrow>
              <Box sx={{ position: "relative" }}>
                <input
                  ref={colorInputRef}
                  type="color"
                  value={selectedColor}
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
                    },
                  }}
                >
                  <AddIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                </Button>
              </Box>
            </Tooltip>
          </Grid>
        )}
      </Grid>
    </Stack>
  );
};
