import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { getIconComponent, Icon } from "@components/icons";
import { TagTable } from "@core/tag";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { TagRead } from "@models/TagRead";
import { Box, Button, Dialog, Stack, Tooltip } from "@mui/material";
import { XYPosition } from "@xyflow/react";
import { MRT_RowSelectionState } from "material-react-table";
import { useCallback, useState } from "react";
import { ReactFlowService } from "../../_hooks/ReactFlowService";
import { AddNodeDialogProps } from "../../_types/AddNodeDialogProps";
import { PendingAddNodeAction } from "../../_types/PendingAddNodeAction";
import { createTagNodes } from "../../_utils/whiteboardUtils";

interface AddTagNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
}

export function AddTagNodeDialog({ projectId, buttonProps, onClick }: AddTagNodeDialogProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const {
    isOpen,
    open: handleOpen,
    close: handleClose,
  } = useDialog({
    onClose: () => setRowSelectionModel({}),
  });

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  const handleConfirmSelection = useCallback(
    (tags: TagRead[]) => {
      const addTagNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
        reactFlowService.addNodes(createTagNodes({ tags, position: position }));
      onClick(addTagNode);
      handleClose();
    },
    [onClick, handleClose],
  );

  // rendering
  const renderBottomToolbar = useCallback(
    (props: { selectedTags: TagRead[] }) => (
      <Stack direction={"row"} spacing={1} alignItems="center" p={1}>
        <Box flexGrow={1} />
        <Button onClick={() => handleConfirmSelection(props.selectedTags)} disabled={props.selectedTags.length === 0}>
          Add {props.selectedTags.length > 0 ? props.selectedTags.length : null} Tags
        </Button>
      </Stack>
    ),
    [handleConfirmSelection],
  );

  return (
    <>
      <Tooltip title="Add tags" placement="right" arrow>
        <Button onClick={handleOpen} {...buttonProps}>
          {getIconComponent(Icon.TAG)}
        </Button>
      </Tooltip>
      <Dialog open={isOpen} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        <DATSDialogHeader
          title="Select tags to add to Whiteboard"
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        <TagTable
          projectId={projectId}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionChange={setRowSelectionModel}
          renderBottomToolbar={renderBottomToolbar}
        />
      </Dialog>
    </>
  );
}
