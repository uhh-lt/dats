import { Button } from "@mui/material";
import React, { useCallback } from "react";
import { useReactFlow } from "reactflow";
import { useReactFlowService } from "../hooks/ReactFlowService";
import { createBorderNode, createTextNode } from "../whiteboardUtils";

import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SquareOutlinedIcon from "@mui/icons-material/SquareOutlined";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";

type BorderNodeType = "Rounded" | "Ellipse" | "Rectangle";

const borderNodeType2Icons: Record<BorderNodeType, React.ReactElement> = {
  Rounded: <CheckBoxOutlineBlankIcon />,
  Ellipse: <RadioButtonUncheckedIcon />,
  Rectangle: <SquareOutlinedIcon />,
};

interface AddBorderNodeButtonProps {
  type: BorderNodeType;
}

function AddBorderNodeButton({ type }: AddBorderNodeButtonProps) {
  const reactFlowInstance = useReactFlow();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  const handleAddBorderNode = useCallback(() => {
    switch (type) {
      case "Rounded":
        reactFlowService.addNodes([createBorderNode({ borderRadius: "25px" })]);
        break;
      case "Ellipse":
        reactFlowService.addNodes([createBorderNode({ borderRadius: "100%" })]);
        break;
      case "Rectangle":
        reactFlowService.addNodes([createBorderNode({ borderRadius: "0px" })]);
        break;
    }
  }, [reactFlowService, type]);

  return (
    <Button onClick={handleAddBorderNode}>
      Add
      {borderNodeType2Icons[type]} shape
    </Button>
  );
}

export default AddBorderNodeButton;
