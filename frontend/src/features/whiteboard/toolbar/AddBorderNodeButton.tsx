import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SquareOutlinedIcon from "@mui/icons-material/SquareOutlined";
import { Button, Tooltip } from "@mui/material";
import { ReactElement, useCallback } from "react";
import { XYPosition } from "reactflow";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { createBorderNode } from "../whiteboardUtils.ts";

type BorderNodeType = "Rounded" | "Ellipse" | "Rectangle";

const borderNodeType2Icons: Record<BorderNodeType, ReactElement> = {
  Rounded: <CheckBoxOutlineBlankIcon />,
  Ellipse: <RadioButtonUncheckedIcon />,
  Rectangle: <SquareOutlinedIcon />,
};

interface AddBorderNodeButtonProps extends AddNodeDialogProps {
  type: BorderNodeType;
}

export function AddBorderNodeButton({ type, onClick, buttonProps }: AddBorderNodeButtonProps) {
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
    <Tooltip title={`Add ${type.toLowerCase()} shape`} placement="right" arrow>
      <Button onClick={handleAddBorderNode} aria-label={`Add ${type.toLowerCase()} shape`} {...buttonProps}>
        {borderNodeType2Icons[type]}
      </Button>
    </Tooltip>
  );
}
