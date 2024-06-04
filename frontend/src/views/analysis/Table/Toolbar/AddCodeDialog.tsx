import { Box, Button, ButtonProps, Dialog, DialogTitle, Stack } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useState } from "react";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import CodeTable from "../../../../components/Code/CodeTable.tsx";

export interface AddCodeDialogProps {
  projectId: number;
  shouldOpen: () => boolean;
  onConfirmSelection: (codes: CodeRead[], addRows: boolean) => void;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddCodeDialog({ projectId, shouldOpen, onConfirmSelection, buttonProps }: AddCodeDialogProps) {
  // local state
  const [open, setOpen] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  const onOpenDialogClick = () => {
    setOpen(shouldOpen());
  };

  const handleClose = () => {
    setOpen(false);
    setRowSelectionModel({});
  };

  const handleConfirmSelection = (codes: CodeRead[], isAddCodesToCell: boolean) => {
    onConfirmSelection(codes, !isAddCodesToCell);
    handleClose();
  };

  return (
    <>
      <Button onClick={onOpenDialogClick} {...buttonProps}>
        Add codes
      </Button>
      <Dialog onClose={() => setOpen(false)} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select codes to add to table</DialogTitle>
        <CodeTable
          projectId={projectId}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionChange={setRowSelectionModel}
          renderBottomToolbarCustomActions={(props) => (
            <Stack direction={"row"} spacing={1} alignItems="center" p={1}>
              <Box flexGrow={1} />
              <Button onClick={handleClose}>Close</Button>
              <Button onClick={() => handleConfirmSelection(props.selectedCodes, true)}>Add to cell</Button>
              <Button onClick={() => handleConfirmSelection(props.selectedCodes, false)}>Add as rows</Button>
            </Stack>
          )}
        />
      </Dialog>
    </>
  );
}

export default AddCodeDialog;
