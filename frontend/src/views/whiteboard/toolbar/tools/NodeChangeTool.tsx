import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SquareOutlinedIcon from "@mui/icons-material/SquareOutlined";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import TitleIcon from "@mui/icons-material/Title";
import { Grid2 as Grid, IconButton, Menu, Tooltip } from "@mui/material";
import { useState } from "react";
import { Node } from "reactflow";
import { BorderData } from "../../types/base/BorderData";

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

  // Common style for icon buttons
  const getIconStyle = (nodeType: string) => ({
    cursor: "pointer",
    transition: "all 0.2s ease",
    color: isNodeTypeActive(nodeType) ? "primary.main" : "inherit",
    backgroundColor: isNodeTypeActive(nodeType) ? "action.selected" : "transparent",
    borderRadius: "4px",
    "&:hover": {
      transform: "scale(1.2)",
      backgroundColor: "action.hover",
    },
  });

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
          sx={{ color: "black", mr: 1, "&:hover": { color: "black", backgroundColor: "transparent" } }}
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
          "& .MuiPaper-root": { boxShadow: 1, mt: 1.8 },
        }}
      >
        <Grid container columns={3} sx={{ justifyContent: "start", px: 1.2, gap: 0 }}>
          <Grid size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
            <Tooltip title="Text" arrow>
              <TitleIcon fontSize="medium" onClick={() => handleNodeTypeChange("text")} sx={getIconStyle("text")} />
            </Tooltip>
          </Grid>
          <Grid size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
            <Tooltip title="Note" arrow>
              <StickyNote2Icon
                fontSize="medium"
                onClick={() => handleNodeTypeChange("note")}
                sx={getIconStyle("note")}
              />
            </Tooltip>
          </Grid>
          <Grid size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
            <Tooltip title="Ellipse" arrow>
              <RadioButtonUncheckedIcon
                fontSize="medium"
                onClick={() => handleNodeTypeChange("ellipse")}
                sx={getIconStyle("ellipse")}
              />
            </Tooltip>
          </Grid>
          <Grid size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
            <Tooltip title="Rectangle" arrow>
              <SquareOutlinedIcon
                fontSize="medium"
                onClick={() => handleNodeTypeChange("rectangle")}
                sx={getIconStyle("rectangle")}
              />
            </Tooltip>
          </Grid>
          <Grid size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
            <Tooltip title="Rounded" arrow>
              <CheckBoxOutlineBlankIcon
                fontSize="medium"
                onClick={() => handleNodeTypeChange("rounded")}
                sx={getIconStyle("rounded")}
              />
            </Tooltip>
          </Grid>
        </Grid>
      </Menu>
    </>
  );
};

export default NodeChangeTool;
