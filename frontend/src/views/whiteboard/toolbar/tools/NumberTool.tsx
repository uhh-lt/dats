import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Box, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { useRef, useState } from "react";

interface NumberToolProps {
  value: number | undefined;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
}

function NumberTool({ value, onValueChange, min, max }: NumberToolProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const defaultSize = 1;
  let timeout: NodeJS.Timeout | undefined;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (size: number) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      onValueChange(size);
    }, 333);
    handleClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentSize = value || defaultSize;

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (currentSize < max) {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
          onValueChange(currentSize + 1);
        }, 333);
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (currentSize > min) {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
          onValueChange(currentSize - 1);
        }, 333);
      }
    }
  };

  const handleIncreaseSize = () => {
    const currentSize = value || defaultSize;
    if (currentSize < max) {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        onValueChange(currentSize + 1);
      }, 333);
    }
  };

  const handleDecreaseSize = () => {
    const currentSize = value || defaultSize;
    if (currentSize > min) {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        onValueChange(currentSize - 1);
      }, 333);
    }
  };

  return (
    <>
      <Tooltip title="Size" arrow>
        <Box
          ref={inputRef}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            position: "relative",
            height: "32px",
            width: "40px",
            cursor: "pointer",
          }}
        >
          <Typography variant="body2" sx={{ flex: 1, textAlign: "center" }}>
            {value || defaultSize}
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              ml: 1.8,
            }}
          ></Box>
        </Box>
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
              width: "60px",
              maxHeight: "300px",
              marginTop: 1.8,
              boxShadow: 3,
            },
          },
        }}
      >
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((size) => (
          <MenuItem
            key={size}
            onClick={() => handleMenuItemClick(size)}
            selected={size === value}
            sx={{ px: 2, py: 0.5 }}
          >
            <Typography>{size}</Typography>
          </MenuItem>
        ))}
      </Menu>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <Box
          sx={{
            flex: 1,
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
          <KeyboardArrowUpIcon fontSize="small" />
        </Box>
        <Box
          sx={{
            flex: 1,
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
          <KeyboardArrowDownIcon fontSize="small" />
        </Box>
      </Box>
    </>
  );
}

export default NumberTool;
