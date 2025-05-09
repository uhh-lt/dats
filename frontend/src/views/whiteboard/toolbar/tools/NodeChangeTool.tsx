import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SquareOutlinedIcon from "@mui/icons-material/SquareOutlined";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import TitleIcon from "@mui/icons-material/Title";
import { Box, IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import { useState } from "react";
import { Node } from "reactflow";
import { BorderData } from "../../types/base/BorderData";

enum NodeType {
  TEXT = "text",
  NOTE = "note",
  ELLIPSE = "ellipse",
  RECTANGLE = "rectangle",
  ROUNDED = "rounded",
}

const NodeTypeIconMap = {
  [NodeType.TEXT]: <TitleIcon />,
  [NodeType.NOTE]: <StickyNote2Icon />,
  [NodeType.ELLIPSE]: <RadioButtonUncheckedIcon />,
  [NodeType.RECTANGLE]: <SquareOutlinedIcon />,
  [NodeType.ROUNDED]: <CheckBoxOutlineBlankIcon />,
};

interface NodeChangeToolProps {
  onNodeTypeChange: (nodeType: string) => void;
  node?: Node;
}

const NodeChangeTool: React.FC<NodeChangeToolProps> = ({ onNodeTypeChange, node }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNodeTypeChange = (nodeType: string) => {
    onNodeTypeChange(nodeType);
    handleMenuClose();
  };

  // Check if a node type is currently active
  const isNodeTypeActive = (nodeType: string) => {
    if (!node) return false;

    if (nodeType === "text" || nodeType === "note") {
      return node.type === nodeType;
    }

    if (node.type === "border") {
      const borderData = node.data as BorderData;
      if (nodeType === "ellipse") return borderData.borderRadius === "100%";
      if (nodeType === "rectangle") return borderData.borderRadius === "0px";
      if (nodeType === "rounded") return borderData.borderRadius === "25px";
    }

    return false;
  };

  // Get the appropriate icon based on node type and shape
  const getNodeTypeIcon = () => {
    if (!node) return <CheckBoxOutlineBlankIcon />;

    const borderData = node.type === "border" ? (node.data as BorderData) : null;

    switch (node.type) {
      case "text":
        return <TitleIcon />;
      case "note":
        return <StickyNote2Icon />;
      case "border":
        if (!borderData) return <CheckBoxOutlineBlankIcon />;
        if (borderData.borderRadius === "100%") {
          return <RadioButtonUncheckedIcon />;
        } else if (borderData.borderRadius === "0px") {
          return <SquareOutlinedIcon />;
        } else if (borderData.borderRadius === "25px") {
          return <CheckBoxOutlineBlankIcon />;
        }
        return <CheckBoxOutlineBlankIcon />;
      default:
        return <CheckBoxOutlineBlankIcon />;
    }
  };

  return (
    <>
      <Tooltip title="Change Node Type" arrow disableHoverListener={open}>
        <IconButton
          size="large"
          sx={{
            color: "black",
            mr: 1,
            borderRadius: "0px",
            "&:hover": { color: "black", backgroundColor: "transparent" },
          }}
          onClick={handleMenuOpen}
        >
          {getNodeTypeIcon()}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
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
            boxShadow: 1,
            mt: 1.8,
            p: 0,
            width: "140px",
          },
          "& .MuiList-root": { p: 0 },
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", width: "100%", p: 0, m: 0 }}>
          {Object.values(NodeType).map((type) => {
            const icon = NodeTypeIconMap[type];
            return (
              <Box
                key={type}
                sx={{
                  width: "33.33%",
                  display: "flex",
                  justifyContent: "center",
                  p: 0,
                  m: 0,
                }}
              >
                <Tooltip title={type} arrow>
                  <MenuItem
                    selected={isNodeTypeActive(type)}
                    onClick={() => handleNodeTypeChange(type)}
                    sx={{
                      p: 1,
                      m: 0,
                      minWidth: "auto",
                      width: "100%",
                      justifyContent: "center",
                    }}
                  >
                    {icon}
                  </MenuItem>
                </Tooltip>
              </Box>
            );
          })}
        </Box>
      </Menu>
    </>
  );
};

export default NodeChangeTool;
