import { Box, Button, ButtonGroup, Menu, MenuItem, Stack, Tooltip } from "@mui/material";
import { useState } from "react";

interface SolidDashedDottedToolProps {
  value: "solid" | "dashed" | "dotted";
  onValueChange: (value: "solid" | "dashed" | "dotted") => void;
}

function SolidDashedDottedTool({ value, onValueChange }: SolidDashedDottedToolProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleStyleClick = (style: "solid" | "dashed" | "dotted") => () => {
    onValueChange(style);
    handleClose();
  };

  const getBorderStyle = (style: "solid" | "dashed" | "dotted") => {
    switch (style) {
      case "solid":
        return "1px solid currentColor";
      case "dashed":
        return "1px dashed currentColor";
      case "dotted":
        return "1px dotted currentColor";
    }
  };

  return (
    <>
      <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
        <Tooltip title="Border style" arrow>
          <Button variant="text" onClick={handleClick} sx={{ minWidth: 0, py: 1, color: "black" }}>
            <Box
              sx={{
                width: 20,
                height: 0,
                border: getBorderStyle(value),
              }}
            />
          </Button>
        </Tooltip>
      </ButtonGroup>
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
        sx={{
          "& .MuiPaper-root": {
            padding: 0,
            paddingY: 0.8,
            margin: 0,
            marginTop: 2.5,
            elevation: 1,
            boxShadow: 1,
          },
          "& .MuiList-root": {
            padding: 0,
          },
        }}
      >
        <Stack direction="row" spacing={1}>
          <MenuItem
            onClick={handleStyleClick("solid")}
            selected={value === "solid"}
            sx={{ minWidth: "auto", m: 0, p: 1 }}
          >
            <Box
              sx={{
                width: 20,
                height: 0,
                border: "1px solid currentColor",
              }}
            />
          </MenuItem>
          <MenuItem
            onClick={handleStyleClick("dashed")}
            selected={value === "dashed"}
            sx={{ minWidth: "auto", m: 0, p: 1 }}
          >
            <Box
              sx={{
                width: 20,
                height: 0,
                border: "1px dashed currentColor",
              }}
            />
          </MenuItem>
          <MenuItem
            onClick={handleStyleClick("dotted")}
            selected={value === "dotted"}
            sx={{ minWidth: "auto", m: 0, p: 1 }}
          >
            <Box
              sx={{
                width: 20,
                height: 0,
                border: "1px dotted currentColor",
              }}
            />
          </MenuItem>
        </Stack>
      </Menu>
    </>
  );
}

export default SolidDashedDottedTool;
