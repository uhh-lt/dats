import { Button } from "@mui/material";
import { useCallback } from "react";
import { XYPosition } from "reactflow";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { createNoteNode } from "../whiteboardUtils.ts";

function AddNoteNodeButton({ onClick }: AddNodeDialogProps) {
  const handleAddNoteNode = useCallback(() => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes([createNoteNode({ position: position })]);
    onClick(addNode);
  }, [onClick]);

  return <Button onClick={handleAddNoteNode}>Add note</Button>;
}

export default AddNoteNodeButton;
