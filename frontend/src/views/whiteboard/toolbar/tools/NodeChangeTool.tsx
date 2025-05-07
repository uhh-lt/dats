import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SquareOutlinedIcon from "@mui/icons-material/SquareOutlined";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import TitleIcon from "@mui/icons-material/Title";
import { Grid2 as Grid, IconButton, Menu, Tooltip, Typography } from "@mui/material";
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

  // Common style for icon buttons
  const iconStyle = {
    cursor: "pointer",
    transition: "transform 0.2s ease",
    "&:hover": {
      transform: "scale(1.2)",
    },
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
        <Grid container columns={3} sx={{ justifyContent: "start", px: 1.2 }}>
          <Grid size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
            <Tooltip title="Text" arrow>
              <TitleIcon fontSize="medium" onClick={() => handleNodeTypeChange("text")} sx={iconStyle} />
            </Tooltip>
          </Grid>
          <Grid size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
            <Tooltip title="Note" arrow>
              <StickyNote2Icon fontSize="medium" onClick={() => handleNodeTypeChange("note")} sx={iconStyle} />
            </Tooltip>
          </Grid>
          <Grid size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
            <Tooltip title="Ellipse" arrow>
              <RadioButtonUncheckedIcon
                fontSize="medium"
                onClick={() => handleNodeTypeChange("ellipse")}
                sx={iconStyle}
              />
            </Tooltip>
          </Grid>
          <Grid size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
            <Tooltip title="Rectangle" arrow>
              <SquareOutlinedIcon fontSize="medium" onClick={() => handleNodeTypeChange("rectangle")} sx={iconStyle} />
            </Tooltip>
          </Grid>
          <Grid size={{ xs: 1 }} sx={{ display: "flex", justifyContent: "center", pt: 0.5 }}>
            <Tooltip title="Rounded" arrow>
              <CheckBoxOutlineBlankIcon
                fontSize="medium"
                onClick={() => handleNodeTypeChange("rounded")}
                sx={iconStyle}
              />
            </Tooltip>
          </Grid>
        </Grid>
        <Typography
          variant="caption"
          sx={{ px: 2, py: 1, color: "text.secondary", justifyContent: "center", display: "flex" }}
        >
          All Node Types
        </Typography>
      </Menu>
    </>
  );
};

export default NodeChangeTool;
