import { Button, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { XYPosition } from "reactflow";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { createTextNode } from "../whiteboardUtils.ts";

function AddTextNodeButton({ onClick, buttonProps }: AddNodeDialogProps) {
  const handleAddTextNode = useCallback(() => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes([createTextNode({ position: position })]);
    onClick(addNode);
  }, [onClick]);

  return (
    <Tooltip title="Add text" placement="right">
      <Button onClick={handleAddTextNode} aria-label="Add text" {...buttonProps}>
        {getIconComponent(Icon.TEXT_DOCUMENT)}
      </Button>
    </Tooltip>
  );
}

export default AddTextNodeButton;
