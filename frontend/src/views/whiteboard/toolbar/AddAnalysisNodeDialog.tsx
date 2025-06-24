import { Person } from "@mui/icons-material";
import { Box, Button, ButtonProps, Dialog, Stack, Tooltip } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useCallback, useState } from "react";
import { XYPosition } from "reactflow";
import { TimelineAnalysisRead } from "../../../api/openapi/models/TimelineAnalysisRead.ts";
import AnalysisTable from "../../../components/Analysis/AnalysisTable.tsx";
import DATSDialogHeader from "../../../components/MUI/DATSDialogHeader.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createTimelineAnalysisNodes } from "../whiteboardUtils.ts";

export interface AddAnalysisNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddAnalysisNodeDialog({ projectId, buttonProps, onClick }: AddAnalysisNodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  const handleOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setRowSelectionModel({});
  };

  const [isMaximized, setIsMaximized] = useState(false);
  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  const handleConfirmSelection = useCallback(
    (analyses: TimelineAnalysisRead[]) => {
      const addAnalysisNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
        reactFlowService.addNodes(createTimelineAnalysisNodes({ analyses, position }));
      onClick(addAnalysisNode);
      handleClose();
    },
    [onClick],
  );

  const renderBottomToolbar = useCallback(
    (props: { selectedAnalyses: TimelineAnalysisRead[] }) => (
      <Stack direction={"row"} spacing={1} alignItems="center" p={1}>
        <Box flexGrow={1} />
        <Button
          onClick={() => handleConfirmSelection(props.selectedAnalyses)}
          disabled={props.selectedAnalyses.length === 0}
        >
          Add {props.selectedAnalyses.length > 0 ? props.selectedAnalyses.length : null} Analysis
          {props.selectedAnalyses.length !== 1 ? "es" : ""}
        </Button>
      </Stack>
    ),
    [handleConfirmSelection],
  );

  return (
    <>
      <Tooltip title="Add analysis" placement="right" arrow>
        <Button onClick={handleOpenDialogClick} {...buttonProps}>
          <Person />
        </Button>
      </Tooltip>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        <DATSDialogHeader
          title="Select analysis to add to Whiteboard"
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={handleToggleMaximize}
        />
        <AnalysisTable
          projectId={projectId}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionChange={setRowSelectionModel}
          renderBottomToolbar={renderBottomToolbar}
        />
      </Dialog>
    </>
  );
}

export default AddAnalysisNodeDialog;
