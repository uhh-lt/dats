import TextFieldsIcon from "@mui/icons-material/TextFields";
import { Button, Tooltip } from "@mui/material";
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

  return (
    <Tooltip title="Add text" placement="right">
      <Button onClick={handleAddTextNode} aria-label="Add text">
        <TextFieldsIcon />
      </Button>
    </Tooltip>
  );
}

export default AddTextNodeButton;
