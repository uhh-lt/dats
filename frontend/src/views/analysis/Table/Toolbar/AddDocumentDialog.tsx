import { Box, Button, ButtonProps, Dialog, DialogTitle } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState } from "material-react-table";
import { useState } from "react";
import SdocTable from "../../../../components/SourceDocument/SdocTable/SdocTable.tsx";

const filterName = "sdocDialogTable";

export interface AddDocumentDialogProps {
  projectId: number;
  shouldOpen: () => boolean;
  onConfirmSelection: (sddocIds: number[], addRows: boolean) => void;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddDocumentDialog({ projectId, shouldOpen, onConfirmSelection, buttonProps }: AddDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const selectedSdocIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  const handleOpenDialogClick = () => {
    setOpen(shouldOpen());
  };

  const handleClose = () => {
    setOpen(false);
    setRowSelectionModel({});
  };

  const handleConfirmSelection = (addRows: boolean) => {
    onConfirmSelection(selectedSdocIds, addRows);
    handleClose();
  };

  return (
    <>
      <Button onClick={handleOpenDialogClick} {...buttonProps}>
        Add documents
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select documents to add to Whiteboard</DialogTitle>
        <SdocTable
          projectId={projectId}
          filterName={filterName}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionChange={setRowSelectionModel}
          sortingModel={sortingModel}
          onSortingChange={setSortingModel}
          renderBottomToolbarCustomActions={() => (
            <>
              <Box flexGrow={1} />
              <Button onClick={handleClose}>Close</Button>
              <Button onClick={() => handleConfirmSelection(false)} disabled={selectedSdocIds.length === 0}>
                Add {selectedSdocIds.length > 0 ? selectedSdocIds.length : null} Documents to cell
              </Button>
              <Button onClick={() => handleConfirmSelection(true)} disabled={selectedSdocIds.length === 0}>
                Add {selectedSdocIds.length > 0 ? selectedSdocIds.length : null} Documents as new rows below cell
              </Button>
            </>
          )}
        />
      </Dialog>
    </>
  );
}

export default AddDocumentDialog;
