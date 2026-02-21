import { Box, Button, Menu, Stack, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { BorderStyle } from "../../../../api/openapi/models/BorderStyle.ts";
import { ColorGrid } from "./ColorGrid.tsx";

interface BorderColorToolProps {
  color: string;
  onColorChange: (color: string) => void;
  borderStyle: BorderStyle;
  onBorderStyleChange: (style: BorderStyle) => void;
}

export function BorderColorTool({ color, onColorChange, borderStyle, onBorderStyleChange }: BorderColorToolProps) {
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
      <Tooltip title="Border style" arrow>
        <Button
          size="small"
          onClick={handleClick}
          sx={{
            minWidth: 0,
            width: 28,
            height: 28,
            p: 0,
            borderRadius: "50%",
            bgcolor: "transparent",
            border: `4px solid ${color}`,
            "&:hover": {
              bgcolor: "transparent",
              border: `4px solid ${color}`,
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
            Border style
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: "center" }}>
            {Object.values(BorderStyle).map((type) => (
              <Tooltip title={type} arrow key={type}>
                <Button
                  size="small"
                  onClick={() => onBorderStyleChange(type)}
                  sx={{
                    minWidth: "auto",
                    width: 32,
                    height: 32,
                    color: "black",
                    borderRadius: "50%",
                    bgcolor: borderStyle === type ? "action.selected" : "transparent",
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
            Border Colors
          </Typography>
          <ColorGrid selectedColor={color} onColorChange={onColorChange} />
        </Stack>
      </Menu>
    </Box>
  );
}
