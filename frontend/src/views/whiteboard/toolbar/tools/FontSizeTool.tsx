import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Box, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { useRef, useState } from "react";

interface FontSizeToolProps {
  size: number | undefined;
  onSizeChange: (size: number) => void;
}

const FontSizeTool: React.FC<FontSizeToolProps> = ({ size, onSizeChange }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const defaultSize = 16;
  const minSize = 8;
  const maxSize = 72;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (size: number) => {
    onSizeChange(size);
    handleClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentSize = size || defaultSize;

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (currentSize < maxSize) {
        onSizeChange(currentSize + 1);
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (currentSize > minSize) {
        onSizeChange(currentSize - 1);
      }
    }
  };

  const handleIncreaseFontSize = () => {
    const currentSize = size || defaultSize;
    if (currentSize < maxSize) {
      onSizeChange(currentSize + 1);
    }
  };

  const handleDecreaseFontSize = () => {
    const currentSize = size || defaultSize;
    if (currentSize > minSize) {
      onSizeChange(currentSize - 1);
    }
  };

  return (
    <>
      <Tooltip title="Text size" arrow>
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
            px: 1,
            cursor: "pointer",
          }}
        >
          <Typography variant="body2" sx={{ flex: 1 }}>
            {size || defaultSize}
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
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
              marginTop: "19px",
              boxShadow: 1,
              elevation: 1,
            },
          },
        }}
      >
        {Array.from({ length: maxSize - minSize + 1 }, (_, i) => minSize + i).map((fontSize) => (
          <MenuItem
            key={fontSize}
            onClick={() => handleMenuItemClick(fontSize)}
            selected={size === fontSize}
            sx={{ px: 2, py: 0.5 }}
          >
            <Typography>{fontSize}</Typography>
          </MenuItem>
        ))}
      </Menu>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", px: 1 }}>
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
            handleIncreaseFontSize();
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
            handleDecreaseFontSize();
          }}
        >
          <KeyboardArrowDownIcon fontSize="small" />
        </Box>
      </Box>
    </>
  );
};

export default FontSizeTool;
