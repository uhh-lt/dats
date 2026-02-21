import { Box, Button, ButtonProps, Dialog, Stack, Tooltip } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useCallback, useState } from "react";
import { XYPosition } from "reactflow";
import { TagRead } from "../../../api/openapi/models/TagRead.ts";
import { DATSDialogHeader } from "../../../components/MUI/DATSDialogHeader.tsx";
import { TagTable } from "../../../core/tag/table/TagTable.tsx";
import { useDialog } from "../../../hooks/useDialog.ts";
import { useDialogMaximize } from "../../../hooks/useDialogMaximize.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createTagNodes } from "../whiteboardUtils.ts";

export interface AddTagNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

export function AddTagNodeDialog({ projectId, buttonProps, onClick }: AddTagNodeDialogProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const dialog = useDialog({
    onClose: () => setRowSelectionModel({}),
  });

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  const handleConfirmSelection = useCallback(
    (tags: TagRead[]) => {
      const addTagNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
        reactFlowService.addNodes(createTagNodes({ tags, position: position }));
      onClick(addTagNode);
      dialog.close();
    },
    [onClick, dialog],
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
        <Button onClick={dialog.open} {...buttonProps}>
          {getIconComponent(Icon.TAG)}
        </Button>
      </Tooltip>
      <Dialog open={dialog.isOpen} onClose={dialog.close} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        <DATSDialogHeader
          title="Select tags to add to Whiteboard"
          onClose={dialog.close}
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
