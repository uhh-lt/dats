import { Button } from "@mui/material";
import { useCallback } from "react";
import { XYPosition } from "reactflow";
import { ReactFlowService } from "../hooks/ReactFlowService";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps";
import { createNoteNode } from "../whiteboardUtils";

function AddNoteNodeButton({ onClick }: AddNodeDialogProps) {
  const handleAddNoteNode = useCallback(() => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes([createNoteNode({ position: position })]);
    onClick(addNode);
  }, [onClick]);

  return <Button onClick={handleAddNoteNode}>Add note</Button>;
}

export default AddNoteNodeButton;
