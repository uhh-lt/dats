import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import { Button, Tooltip } from "@mui/material";
import { XYPosition } from "@xyflow/react";
import { useCallback } from "react";
import { ReactFlowService } from "../../_hooks/ReactFlowService";
import { AddNodeDialogProps } from "../../_types/AddNodeDialogProps";
import { createNoteNode } from "../../_utils/whiteboardUtils";

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
