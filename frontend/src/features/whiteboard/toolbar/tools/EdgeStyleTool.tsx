import MovingIcon from "@mui/icons-material/Moving";
import StraightIcon from "@mui/icons-material/Straight";
import TurnRightIcon from "@mui/icons-material/TurnRight";
import UTurnRightIcon from "@mui/icons-material/UTurnRight";
import { Box, Button, Grid2 as Grid, Menu, Stack, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { WhiteboardEdgeType } from "../../../../api/openapi/models/WhiteboardEdgeType.ts";
import { StrokeStyle } from "../../types/base/StrokeStyle.ts";
import { ColorGrid } from "./ColorGrid.tsx";

interface EdgeColorToolProps {
  color: string;
  onColorChange: (color: string) => void;
  strokeStyle: StrokeStyle;
  onStrokeStyleChange: (style: StrokeStyle) => void;
  edgeType: WhiteboardEdgeType;
  onEdgeTypeChange: (type: WhiteboardEdgeType) => void;
}

const type2icon: Record<string, React.ReactElement> = {
  bezier: <MovingIcon />,
  simplebezier: <UTurnRightIcon style={{ transform: "rotate(270deg)" }} />,
  straight: <StraightIcon style={{ transform: "rotate(90deg)" }} />,
  smoothstep: <TurnRightIcon />,
};

export function EdgeStyleTool({
  color,
  onColorChange,
  strokeStyle,
  onStrokeStyleChange,
  edgeType,
  onEdgeTypeChange,
}: EdgeColorToolProps) {
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
      <Tooltip title="Edge style" arrow>
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
            Edge Type
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
                      p: 2,
                      color: "black",
                      borderRadius: "50%",
                      bgcolor: edgeType === type ? "action.selected" : "transparent",
                      border: "none",
                      "&:hover": {
                        bgcolor: "action.hover",
                        opacity: 0.7,
                      },
                    }}
                  >
                    {type2icon[type]}
                  </Button>
                </Tooltip>
              </Grid>
            ))}
          </Grid>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Stroke Style
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: "center" }}>
            {Object.values(StrokeStyle).map((type) => (
              <Tooltip title={type} arrow key={type}>
                <Button
                  size="small"
                  onClick={() => onStrokeStyleChange(type)}
                  sx={{
                    minWidth: "auto",
                    width: 32,
                    height: 32,
                    color: "black",
                    borderRadius: "50%",
                    bgcolor: strokeStyle === type ? "action.selected" : "transparent",
                    border: "none",
                    "&:hover": {
                      bgcolor: "action.hover",
                      opacity: 0.7,
                    },
                  }}
                >
                  <p
                    style={{
                      width: "20px",
                      margin: 0,
                      borderTop: `2px black ${type}`,
                    }}
                  />
                </Button>
              </Tooltip>
            ))}
          </Stack>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Color
          </Typography>
          <ColorGrid selectedColor={color} onColorChange={onColorChange} />
        </Stack>
      </Menu>
    </Box>
  );
}
