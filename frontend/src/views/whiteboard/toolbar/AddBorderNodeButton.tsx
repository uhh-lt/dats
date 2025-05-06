import { Button, Tooltip } from "@mui/material";
import React, { useCallback } from "react";
import { XYPosition } from "reactflow";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { createBorderNode } from "../whiteboardUtils.ts";

import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SquareOutlinedIcon from "@mui/icons-material/SquareOutlined";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";

type BorderNodeType = "Rounded" | "Ellipse" | "Rectangle";

const borderNodeType2Icons: Record<BorderNodeType, React.ReactElement> = {
  Rounded: <CheckBoxOutlineBlankIcon />,
  Ellipse: <RadioButtonUncheckedIcon />,
  Rectangle: <SquareOutlinedIcon />,
};

interface AddBorderNodeButtonProps extends AddNodeDialogProps {
  type: BorderNodeType;
}

function AddBorderNodeButton({ type, onClick }: AddBorderNodeButtonProps) {
  const handleAddBorderNode = useCallback(() => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) => {
      switch (type) {
        case "Rounded":
          reactFlowService.addNodes([createBorderNode({ borderRadius: "25px", position })]);
          break;
        case "Ellipse":
          reactFlowService.addNodes([createBorderNode({ borderRadius: "100%", position })]);
          break;
        case "Rectangle":
          reactFlowService.addNodes([createBorderNode({ borderRadius: "0px", position })]);
          break;
      }
    };
    onClick(addNode);
  }, [onClick, type]);

  return (
    <Tooltip title={`Add ${type.toLowerCase()} shape`} placement="right">
      <Button onClick={handleAddBorderNode} aria-label={`Add ${type.toLowerCase()} shape`}>
        {borderNodeType2Icons[type]}
      </Button>
    </Tooltip>
  );
}

export default AddBorderNodeButton;
