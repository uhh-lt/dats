import MovingIcon from "@mui/icons-material/Moving";
import StraightIcon from "@mui/icons-material/Straight";
import TurnRightIcon from "@mui/icons-material/TurnRight";
import UTurnRightIcon from "@mui/icons-material/UTurnRight";
import { Box, Button, Grid2 as Grid, Menu, Stack, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { WhiteboardEdgeType } from "../../../../api/openapi/models/WhiteboardEdgeType.ts";
import ColorGrid from "./ColorGrid.tsx";

interface EdgeColorToolProps {
  color: string;
  onColorChange: (color: string) => void;
  borderStyle: "solid" | "dashed" | "dotted";
  onBorderStyleChange: (style: "solid" | "dashed" | "dotted") => void;
  edgeType: WhiteboardEdgeType;
  onEdgeTypeChange: (type: WhiteboardEdgeType) => void;
}

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

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
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
          <Typography variant="caption" sx={{ color: "text.secondary", p: 1, pb: 0 }}>
            Edge type
          </Typography>
          <Grid container spacing={1} columns={4} sx={{ justifyContent: "start", px: 1, pb: 1 }}>
            {Object.values(WhiteboardEdgeType).map((type) => (
              <Grid key={type} size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center" }}>
                <Tooltip title={type} arrow>
                  <Button
                    size="small"
                    onClick={() => onEdgeTypeChange(type)}
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
          <Typography variant="caption" sx={{ color: "text.secondary", pl: 1, pb: 0 }}>
            Edge Colors
          </Typography>
          <ColorGrid selectedColor={color} onColorChange={onColorChange} />
        </Stack>
      </Menu>
    </Box>
  );
};

export default EdgeColorTool;
