import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SquareOutlinedIcon from "@mui/icons-material/SquareOutlined";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import TitleIcon from "@mui/icons-material/Title";
import { IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import { useMemo, useState } from "react";
import { DATSNode } from "../../../_types/DATSNode";
import { isBorderNode, isNoteNode, isTextNode } from "../../../_types/typeGuards";
import { NodeType } from "./NodeType";

// Check if a node type is currently active
const getNodeType = (node: DATSNode | undefined): NodeType => {
  if (!node) return NodeType.TEXT;

  if (isTextNode(node)) {
    return NodeType.TEXT;
  }
  if (isNoteNode(node)) {
    return NodeType.NOTE;
  }
  if (isBorderNode(node)) {
    if (node.data.borderRadius === "100%") return NodeType.ELLIPSE;
    if (node.data.borderRadius === "0px") return NodeType.RECTANGLE;
    if (node.data.borderRadius === "25px") return NodeType.ROUNDED;
  }
  return NodeType.TEXT;
};

const NodeTypeIconMap = {
  [NodeType.TEXT]: <TitleIcon />,
  [NodeType.NOTE]: <StickyNote2Icon />,
  [NodeType.ELLIPSE]: <RadioButtonUncheckedIcon />,
  [NodeType.RECTANGLE]: <SquareOutlinedIcon />,
  [NodeType.ROUNDED]: <CheckBoxOutlineBlankIcon />,
};

interface NodeChangeToolProps {
  onNodeTypeChange: (nodeType: NodeType) => void;
  node?: DATSNode;
}

export const NodeChangeTool: React.FC<NodeChangeToolProps> = ({ onNodeTypeChange, node }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNodeTypeChange = (nodeType: NodeType) => {
    onNodeTypeChange(nodeType);
    handleMenuClose();
  };

  const nodeType = useMemo(() => getNodeType(node), [node]);

  return (
    <>
      <Tooltip title="Change Node Type" arrow disableHoverListener={open}>
        <IconButton
          size="large"
          sx={{
            p: 0.5,
            color: "black",
            "&:hover": { color: "black", backgroundColor: "transparent" },
          }}
          onClick={handleMenuOpen}
        >
          {NodeTypeIconMap[nodeType]}
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
            mt: "19px",
          },
          "& .MuiList-root": { p: 0 },
        }}
      >
        {Object.values(NodeType).map((type) => {
          const icon = NodeTypeIconMap[type];
          return (
            <Tooltip title={type} arrow placement="left" key={type}>
              <MenuItem
                selected={nodeType === type}
                onClick={() => handleNodeTypeChange(type)}
                sx={{
                  p: 1,
                }}
              >
                {icon}
              </MenuItem>
            </Tooltip>
          );
        })}
      </Menu>
    </>
  );
};
