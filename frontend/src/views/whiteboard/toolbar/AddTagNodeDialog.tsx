import { Box, Button, ButtonProps, Dialog, Stack, Tooltip } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useCallback, useState } from "react";
import { XYPosition } from "reactflow";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import DATSDialogHeader from "../../../components/MUI/DATSDialogHeader.tsx";
import TagTable from "../../../components/Tag/TagTable.tsx";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createTagNodes } from "../whiteboardUtils.ts";

export interface AddTagNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddTagNodeDialog({ projectId, buttonProps, onClick }: AddTagNodeDialogProps) {
  // local state
  const [open, setOpen] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  const handleOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setRowSelectionModel({});
  };

  // maximize dialog
  const [isMaximized, setIsMaximized] = useState(false);
  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  const handleConfirmSelection = useCallback(
    (tags: DocumentTagRead[]) => {
      const addTagNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
        reactFlowService.addNodes(createTagNodes({ tags, position: position }));
      onClick(addTagNode);
      handleClose();
    },
    [onClick],
  );

  // rendering
  const renderBottomToolbar = useCallback(
    (props: { selectedTags: DocumentTagRead[] }) => (
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
      <Tooltip title="Add tags" placement="right">
        <Button onClick={handleOpenDialogClick} {...buttonProps}>
          {getIconComponent(Icon.TAG)}
        </Button>
      </Tooltip>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        <DATSDialogHeader
          title="Select tags to add to Whiteboard"
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={handleToggleMaximize}
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

export default AddTagNodeDialog;
