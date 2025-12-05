import { Box, Button, ButtonProps, Dialog, Stack, Tooltip } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useCallback, useState } from "react";
import { XYPosition } from "reactflow";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import CodeTable from "../../../components/Code/CodeTable.tsx";
import DATSDialogHeader from "../../../components/MUI/DATSDialogHeader.tsx";
import { useDialog } from "../../../hooks/useDialog.ts";
import { useDialogMaximize } from "../../../hooks/useDialogMaximize.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createCodeNodes } from "../whiteboardUtils.ts";

export interface AddCodeNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddCodeNodeDialog({ projectId, buttonProps, onClick }: AddCodeNodeDialogProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const dialog = useDialog({
    onClose: () => setRowSelectionModel({}),
  });
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  const handleConfirmSelection = useCallback(
    (codes: CodeRead[]) => {
      const addNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
        reactFlowService.addNodes(createCodeNodes({ codes, position: position }));
      onClick(addNode);
      dialog.close();
    },
    [onClick, dialog],
  );

  // rendering
  const renderBottomToolbar = useCallback(
    (props: { selectedCodes: CodeRead[] }) => (
      <Stack direction={"row"} spacing={1} alignItems="center" p={1}>
        <Box flexGrow={1} />
        <Button onClick={() => handleConfirmSelection(props.selectedCodes)} disabled={props.selectedCodes.length === 0}>
          Add {props.selectedCodes.length > 0 ? props.selectedCodes.length : null} Codes
        </Button>
      </Stack>
    ),
    [handleConfirmSelection],
  );

  return (
    <>
      <Tooltip title="Add code" placement="right" arrow>
        <Button onClick={dialog.open} {...buttonProps}>
          {getIconComponent(Icon.CODE)}
        </Button>
      </Tooltip>
      <Dialog open={dialog.isOpen} onClose={dialog.close} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        <DATSDialogHeader
          title="Select codes to add to Whiteboard"
          onClose={dialog.close}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        <CodeTable
          projectId={projectId}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionChange={setRowSelectionModel}
          renderBottomToolbar={renderBottomToolbar}
        />
      </Dialog>
    </>
  );
}

export default AddCodeNodeDialog;
