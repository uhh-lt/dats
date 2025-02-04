import { Button } from "@mui/material";
import { useCallback } from "react";
import { XYPosition } from "reactflow";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { createTextNode } from "../whiteboardUtils.ts";

function AddTextNodeButton({ onClick }: AddNodeDialogProps) {
  const handleAddTextNode = useCallback(() => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes([createTextNode({ position: position })]);
    onClick(addNode);
  }, [onClick]);

  return <Button onClick={handleAddTextNode}>Add text</Button>;
}

export default AddTextNodeButton;
