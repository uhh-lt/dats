import { Box, Button, ButtonProps, Dialog } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState } from "material-react-table";
import { useState } from "react";
import SpanAnnotationTable from "../../../../components/SpanAnnotationTable/SpanAnnotationTable.tsx";

const filterName = "spanAnnotationDialogTable";

export interface AddAnnotationDialogProps {
  projectId: number;
  shouldOpen: () => boolean;
  onConfirmSelection: (spanAnnotationIds: number[], addRows: boolean) => void;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddAnnotationDialog({ projectId, onConfirmSelection, shouldOpen, buttonProps }: AddAnnotationDialogProps) {
  const [open, setOpen] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const selectedAnnotationIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  const onOpenDialogClick = () => {
    setOpen(shouldOpen());
  };

  const handleClose = () => {
    setOpen(false);
    setRowSelectionModel({});
  };

  const handleConfirmSelection = (addRows: boolean) => {
    onConfirmSelection(selectedAnnotationIds, addRows);
    handleClose();
  };

  return (
    <>
      <Button onClick={onOpenDialogClick} {...buttonProps}>
        Add annotations
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth PaperProps={{ style: { height: "100%" } }}>
        <SpanAnnotationTable
          title="Select annotations to add to table"
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
              <Button onClick={() => handleConfirmSelection(false)} disabled={selectedAnnotationIds.length === 0}>
                Add {selectedAnnotationIds.length > 0 ? selectedAnnotationIds.length : null} Annotations to cell
              </Button>
              <Button onClick={() => handleConfirmSelection(true)} disabled={selectedAnnotationIds.length === 0}>
                Add {selectedAnnotationIds.length > 0 ? selectedAnnotationIds.length : null} Annotations as new rows
                below cell
              </Button>
            </>
          )}
        />
      </Dialog>
    </>
  );
}

export default AddAnnotationDialog;
