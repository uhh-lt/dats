import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import { Button, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { XYPosition } from "reactflow";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { createNoteNode } from "../whiteboardUtils.ts";

export function AddNoteNodeButton({ onClick, buttonProps }: AddNodeDialogProps) {
  const handleAddNoteNode = useCallback(() => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes([createNoteNode({ position: position })]);
    onClick(addNode);
  }, [onClick]);

  return (
    <Tooltip title="Add note" placement="right" arrow>
      <Button onClick={handleAddNoteNode} aria-label="Add note" {...buttonProps}>
        <StickyNote2Icon />
      </Button>
    </Tooltip>
  );
}
