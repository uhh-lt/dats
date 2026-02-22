import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Box, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import { useState } from "react";

interface NumberToolProps {
  tooltip: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
}

export function NumberTool({ tooltip, value, onValueChange, min, max }: NumberToolProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (size: number) => {
    onValueChange(size);
    handleClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (value < max) {
        onValueChange(value + 1);
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (value > min) {
        onValueChange(value - 1);
      }
    }
  };

  const handleIncreaseSize = () => {
    if (value < max) {
      onValueChange(value + 1);
    }
  };

  const handleDecreaseSize = () => {
    if (value > min) {
      onValueChange(value - 1);
    }
  };

  return (
    <Stack direction="row" alignItems="center">
      <Tooltip title={tooltip} arrow>
        <Typography
          variant="body2"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: "32px",
            width: "32px",
            cursor: "pointer",
          }}
        >
          {value}
        </Typography>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        slotProps={{
          paper: {
            sx: {
              maxHeight: "300px",
              marginTop: "19px",
              boxShadow: 3,
            },
          },
          list: {
            sx: { p: 0 },
          },
        }}
      >
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((size) => (
          <MenuItem key={size} onClick={() => handleMenuItemClick(size)} selected={size === value}>
            <Typography>{size}</Typography>
          </MenuItem>
        ))}
      </Menu>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.04)",
            },
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleIncreaseSize();
          }}
        >
          <KeyboardArrowUpIcon fontSize="inherit" />
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.04)",
            },
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleDecreaseSize();
          }}
        >
          <KeyboardArrowDownIcon fontSize="inherit" />
        </Box>
      </Box>
    </Stack>
  );
}
