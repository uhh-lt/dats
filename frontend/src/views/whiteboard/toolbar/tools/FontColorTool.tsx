import { FormatColorText as FormatColorTextIcon } from "@mui/icons-material";
import { Box, Button, Menu, Stack, Tooltip } from "@mui/material";
import { useState } from "react";
import ColorGrid from "./ColorGrid.tsx";

interface FontColorToolProps {
  color: string;
  onColorChange: (color: string) => void;
}

const FontColorTool: React.FC<FontColorToolProps> = ({ color, onColorChange }) => {
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
      <Tooltip title="Font color" arrow>
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
            color: color,
            border: "none",
            "&:hover": {
              opacity: 0.8,
            },
          }}
        >
          <FormatColorTextIcon fontSize="medium" />
        </Button>
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
          <ColorGrid selectedColor={color} onColorChange={onColorChange} />
        </Stack>
      </Menu>
    </Box>
  );
};

export default FontColorTool;
