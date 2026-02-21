import ColorLensIcon from "@mui/icons-material/ColorLens";
import { Box, IconButton, Menu, MenuItem } from "@mui/material";
import { useState } from "react";
import { D3ColorScale, d3ColorSchemes } from "../../../utils/D3ColorScale.ts";

interface ColorScalePickerProps {
  onColorChange: (color: D3ColorScale) => void;
}

export function ColorScalePicker({ onColorChange }: ColorScalePickerProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = (cs: D3ColorScale) => () => {
    onColorChange(cs);
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton onClick={handleClick}>
        <ColorLensIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)} sx={{ maxHeight: "400px" }}>
        {Object.values(D3ColorScale).map((cs) => (
          <MenuItem
            key={cs}
            onClick={handleClose(cs)}
            sx={{ width: "200px", display: "flex", alignItems: "center", gap: 1 }}
          >
            {cs}
            <Box
              sx={{
                background: `linear-gradient(to right, ${d3ColorSchemes[cs](0)}, ${d3ColorSchemes[cs](
                  0.5,
                )}, ${d3ColorSchemes[cs](1)})`,
                position: "relative",
                height: "20px",
                width: "100%",
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
