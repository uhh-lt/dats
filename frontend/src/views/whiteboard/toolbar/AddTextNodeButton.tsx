import { Button } from "@mui/material";
import { useCallback } from "react";
import { useReactFlow } from "reactflow";
import { useReactFlowService } from "../hooks/ReactFlowService";
import { createTextNode } from "../whiteboardUtils";

function AddTextNodeButton() {
  const reactFlowInstance = useReactFlow();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  const handleAddTextNode = useCallback(() => {
    reactFlowService.addNodes([createTextNode({})]);
  }, [reactFlowService]);

  return <Button onClick={handleAddTextNode}>Add note</Button>;
}

export default AddTextNodeButton;
