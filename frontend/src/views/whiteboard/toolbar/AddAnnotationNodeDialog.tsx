import { Box, Button, ButtonProps, Dialog } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState } from "material-react-table";
import { useState } from "react";
import { XYPosition, useReactFlow } from "reactflow";
import SpanAnnotationTable from "../../../components/SpanAnnotationTable/SpanAnnotationTable.tsx";
import { useReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { createSpanAnnotationNodes } from "../whiteboardUtils.ts";

const filterName = "spanAnnotationDialogWhiteboard";

export interface AddAnnotationNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddAnnotationNodeDialog({ projectId, buttonProps, onClick }: AddAnnotationNodeDialogProps) {
  // whiteboard (react-flow)
  const reactFlowInstance = useReactFlow();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // local state
  const [open, setOpen] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const selectedAnnotationIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  const onOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setRowSelectionModel({});
  };

  const handleConfirmSelection = () => {
    onClick((position: XYPosition) => {
      const spanAnnotations = selectedAnnotationIds;
      // const bboxAnnotations = selectedAnnotationIds
      //   .filter((annotation) => annotation.sdoc.doctype === DocType.IMAGE)
      //   .map((annotation) => annotation.annotation.id);

      reactFlowService.addNodes([
        ...createSpanAnnotationNodes({ spanAnnotations, position }),
        // ...createBBoxAnnotationNodes({ bboxAnnotations, position }),
      ]);
    });

    handleClose();
  };

  return (
    <>
      <Button onClick={onOpenDialogClick} {...buttonProps}>
        Add annotations
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth PaperProps={{ style: { height: "100%" } }}>
        <SpanAnnotationTable
          title="Select annotations to add to Whiteboard"
          projectId={projectId}
          filterName={filterName}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionChange={setRowSelectionModel}
          sortingModel={sortingModel}
          onSortingChange={setSortingModel}
          onRowContextMenu={(_, spanAnnotationId) => console.log("Row context menu", spanAnnotationId)}
          cardProps={{ elevation: 2, className: "myFlexFillAllContainer myFlexContainer" }}
          renderBottomToolbarCustomActions={() => (
            <>
              <Box flexGrow={1} />
              <Button onClick={handleClose}>Close</Button>
              <Button onClick={handleConfirmSelection} disabled={selectedAnnotationIds.length === 0}>
                Add {selectedAnnotationIds.length > 0 ? selectedAnnotationIds.length : null} Annotations
              </Button>
            </>
          )}
        />
      </Dialog>
    </>
  );
}

export default AddAnnotationNodeDialog;
