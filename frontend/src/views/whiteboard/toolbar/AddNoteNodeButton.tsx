import { Button } from "@mui/material";
import { useCallback } from "react";
import { useReactFlow } from "reactflow";
import { useReactFlowService } from "../hooks/ReactFlowService";
import { createNoteNode } from "../whiteboardUtils";

function AddNoteNodeButton() {
  const reactFlowInstance = useReactFlow();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  const handleAddNoteNode = useCallback(() => {
    reactFlowService.addNodes([createNoteNode({})]);
  }, [reactFlowService]);

  return <Button onClick={handleAddNoteNode}>Add note</Button>;
}

export default AddNoteNodeButton;
