import { Button, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { XYPosition } from "reactflow";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { createNoteNode } from "../whiteboardUtils.ts";

function AddNoteNodeButton({ onClick, buttonProps }: AddNodeDialogProps) {
  const handleAddNoteNode = useCallback(() => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes([createNoteNode({ position: position })]);
    onClick(addNode);
  }, [onClick]);

  return (
    <Tooltip title="Add note" placement="right">
      <Button onClick={handleAddNoteNode} aria-label="Add note" {...buttonProps}>
        {getIconComponent(Icon.MEMO)}
      </Button>
    </Tooltip>
  );
}

export default AddNoteNodeButton;
