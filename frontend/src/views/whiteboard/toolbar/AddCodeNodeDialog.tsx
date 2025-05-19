import { Box, Button, ButtonProps, Dialog, Stack, Tooltip } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useCallback, useState } from "react";
import { XYPosition } from "reactflow";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import CodeTable from "../../../components/Code/CodeTable.tsx";
import DATSDialogHeader from "../../../components/MUI/DATSDialogHeader.tsx";
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
  const [open, setOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  const onOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setRowSelectionModel({});
  };

  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  const handleConfirmSelection = useCallback(
    (codes: CodeRead[]) => {
      const addNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
        reactFlowService.addNodes(createCodeNodes({ codes, position: position }));
      onClick(addNode);
      handleClose();
    },
    [onClick],
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
        <Button onClick={onOpenDialogClick} {...buttonProps}>
          {getIconComponent(Icon.CODE)}
        </Button>
      </Tooltip>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        <DATSDialogHeader
          title="Select codes to add to Whiteboard"
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={handleToggleMaximize}
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
