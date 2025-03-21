import { Button, ButtonProps, Dialog } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState } from "material-react-table";
import { useCallback, useState } from "react";
import { XYPosition } from "reactflow";
import { ElasticSearchDocumentHit } from "../../../api/openapi/models/ElasticSearchDocumentHit.ts";
import { FilterTableToolbarProps } from "../../../components/FilterTable/FilterTableToolbarProps.ts";
import DATSDialogHeader from "../../../components/MUI/DATSDialogHeader.tsx";
import SdocTable from "../../../components/SourceDocument/SdocTable/SdocTable.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { createSdocNodes } from "../whiteboardUtils.ts";

const filterName = "documentDialogWhiteboard";

export interface AddDocumentNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddDocumentNodeDialog({ projectId, buttonProps, onClick }: AddDocumentNodeDialogProps) {
  // local state
  const [open, setOpen] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);

  const selectedSdocIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  const handleOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setRowSelectionModel({});
  };

  // maximize
  const [isMaximized, setIsMaximized] = useState(false);
  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  const handleConfirmSelection = useCallback(() => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createSdocNodes({ sdocs: selectedSdocIds, position: position }));
    onClick(addNode);
    handleClose();
  }, [onClick, selectedSdocIds]);

  // rendering
  const renderBottomToolbar = useCallback(
    (props: FilterTableToolbarProps<ElasticSearchDocumentHit>) => (
      <Button onClick={handleConfirmSelection} disabled={props.selectedData.length === 0}>
        Add {props.selectedData.length > 0 ? props.selectedData.length : null} Documents
      </Button>
    ),
    [handleConfirmSelection],
  );

  return (
    <>
      <Button onClick={handleOpenDialogClick} {...buttonProps}>
        Add documents
      </Button>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        <DATSDialogHeader
          title="Select documents to add to Whiteboard"
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={handleToggleMaximize}
        />
        <SdocTable
          projectId={projectId}
          filterName={filterName}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionChange={setRowSelectionModel}
          sortingModel={sortingModel}
          onSortingChange={setSortingModel}
          renderBottomToolbar={renderBottomToolbar}
        />
      </Dialog>
    </>
  );
}

export default AddDocumentNodeDialog;
