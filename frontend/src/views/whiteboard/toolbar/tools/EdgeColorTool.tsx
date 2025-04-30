import { Add as AddIcon } from "@mui/icons-material";
import MovingIcon from "@mui/icons-material/Moving";
import StraightIcon from "@mui/icons-material/Straight";
import TurnRightIcon from "@mui/icons-material/TurnRight";
import UTurnRightIcon from "@mui/icons-material/UTurnRight";
import { Box, Button, Grid2 as Grid, Menu, Stack, Tooltip, Typography } from "@mui/material";
import { useRef, useState } from "react";

interface EdgeColorToolProps {
  color: string;
  onColorChange: (color: string) => void;
  borderStyle: "solid" | "dashed" | "dotted";
  onBorderStyleChange: (style: "solid" | "dashed" | "dotted") => void;
  edgeType: "bezier" | "simplebezier" | "straight" | "smoothstep";
  onEdgeTypeChange: (type: "bezier" | "simplebezier" | "straight" | "smoothstep") => void;
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

const type2icon: Record<string, React.ReactElement> = {
  bezier: <MovingIcon />,
  simplebezier: <UTurnRightIcon style={{ transform: "rotate(270deg)" }} />,
  straight: <StraightIcon style={{ transform: "rotate(90deg)" }} />,
  smoothstep: <TurnRightIcon />,
};

const EdgeColorTool: React.FC<EdgeColorToolProps> = ({
  color,
  onColorChange,
  borderStyle,
  onBorderStyleChange,
  edgeType,
  onEdgeTypeChange,
}) => {
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

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Tooltip title="Edge color and style" arrow>
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
          <Typography variant="caption" sx={{ color: "text.secondary", p: 1, pb: 0 }}>
            Edge type
          </Typography>
          <Grid container spacing={1} columns={4} sx={{ justifyContent: "start", px: 1, pb: 1 }}>
            {["bezier", "simplebezier", "straight", "smoothstep"].map((type) => (
              <Grid key={type} size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center" }}>
                <Tooltip title={type} arrow>
                  <Button
                    size="small"
                    onClick={() => onEdgeTypeChange(type as "bezier" | "simplebezier" | "straight" | "smoothstep")}
                    sx={{
                      minWidth: 0,
                      width: 24,
                      height: 24,
                      p: 1.8,
                      color: "black",
                      borderRadius: "50%",
                      bgcolor: edgeType === type ? "action.selected" : "transparent",
                      border: "none",
                      "&:hover": {
                        bgcolor: "action.hover",
                        opacity: 0.7,
                        transform: "scale(1.1)",
                      },
                      transition: (theme) => theme.transitions.create(["opacity", "transform", "background-color"]),
                    }}
                  >
                    {type2icon[type]}
                  </Button>
                </Tooltip>
              </Grid>
            ))}
          </Grid>
          <Typography variant="caption" sx={{ color: "text.secondary", pl: 1, pb: 0 }}>
            Edge style
          </Typography>
          <Stack direction="row" spacing={1} sx={{ p: 1, pt: 0, pb: 2, justifyContent: "center" }}>
            <Button
              onClick={() => onBorderStyleChange("solid")}
              sx={{
                minWidth: "auto",
                p: 1,
                "&:hover": { bgcolor: "transparent" },
              }}
            >
              <p
                style={{
                  width: "20px",
                  margin: 0,
                  borderTop: `2px ${borderStyle === "solid" ? "black" : "#666"} solid`,
                }}
              />
            </Button>
            <Button
              onClick={() => onBorderStyleChange("dashed")}
              sx={{
                minWidth: "auto",
                p: 1,
                "&:hover": { bgcolor: "transparent" },
              }}
            >
              <p
                style={{
                  width: "20px",
                  margin: 0,
                  borderTop: `2px ${borderStyle === "dashed" ? "black" : "#666"} dashed`,
                }}
              />
            </Button>
            <Button
              onClick={() => onBorderStyleChange("dotted")}
              sx={{
                minWidth: "auto",
                p: 1,
                "&:hover": { bgcolor: "transparent" },
              }}
            >
              <p
                style={{
                  width: "20px",
                  margin: 0,
                  borderTop: `2px ${borderStyle === "dotted" ? "black" : "#666"} dotted`,
                }}
              />
            </Button>
          </Stack>
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

export default EdgeColorTool;
