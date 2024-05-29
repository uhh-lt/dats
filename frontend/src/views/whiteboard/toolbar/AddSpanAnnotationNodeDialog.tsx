import { Box, Button, ButtonProps, Dialog } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useEffect, useState } from "react";
import { XYPosition } from "reactflow";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import SpanAnnotationTable from "../../../components/SpanAnnotationTable/SpanAnnotationTable.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createSpanAnnotationNodes } from "../whiteboardUtils.ts";

const filterName = "spanAnnotationDialogWhiteboard";

export interface AddSpanAnnotationNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddSpanAnnotationNodeDialog({ projectId, buttonProps, onClick }: AddSpanAnnotationNodeDialogProps) {
  // local state
  const [open, setOpen] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const [visibilityModel, setVisibilityModel] = useState<MRT_VisibilityState | undefined>(undefined);
  const selectedAnnotationIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  // init visibility (disable metadata)
  // TODO: i dont like this solution
  const metadata = ProjectHooks.useGetMetadata(projectId);
  useEffect(() => {
    if (!metadata.data) {
      return;
    }
    setVisibilityModel(
      metadata.data.reduce((acc, curr) => {
        return {
          ...acc,
          [curr.id]: false,
        };
      }, {}),
    );
  }, [metadata.data]);

  const onOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setRowSelectionModel({});
  };

  const handleConfirmSelection = () => {
    const spanAnnotations = selectedAnnotationIds;
    const addNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createSpanAnnotationNodes({ spanAnnotations, position }));
    onClick(addNode);
    handleClose();
  };

  return (
    <>
      <Button onClick={onOpenDialogClick} {...buttonProps}>
        Add annotations
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth PaperProps={{ style: { height: "100%" } }}>
        {visibilityModel && (
          <SpanAnnotationTable
            title="Select span annotations to add to Whiteboard"
            projectId={projectId}
            filterName={filterName}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionChange={setRowSelectionModel}
            sortingModel={sortingModel}
            onSortingChange={setSortingModel}
            columnVisibilityModel={visibilityModel}
            onColumnVisibilityChange={setVisibilityModel as React.Dispatch<React.SetStateAction<MRT_VisibilityState>>}
            cardProps={{ elevation: 2, className: "myFlexFillAllContainer myFlexContainer" }}
            renderBottomToolbarCustomActions={(props) => (
              <>
                <Box flexGrow={1} />
                <Button onClick={handleClose}>Close</Button>
                <Button onClick={handleConfirmSelection} disabled={props.selectedAnnotations.length === 0}>
                  Add {props.selectedAnnotations.length > 0 ? props.selectedAnnotations.length : null} Annotations
                </Button>
              </>
            )}
          />
        )}
      </Dialog>
    </>
  );
}

export default AddSpanAnnotationNodeDialog;
