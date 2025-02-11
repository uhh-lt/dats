import { Box, Button, ButtonProps, CircularProgress, Dialog } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useState } from "react";
import MetadataHooks from "../../../../api/MetadataHooks.ts";
import { ProjectMetadataRead } from "../../../../api/openapi/models/ProjectMetadataRead.ts";
import SpanAnnotationTable from "../../../../components/SpanAnnotation/SpanAnnotationTable/SpanAnnotationTable.tsx";

const filterName = "spanAnnotationDialogTable";

interface AddAnnotationDialogProps {
  projectId: number;
  shouldOpen: () => boolean;
  onConfirmSelection: (spanAnnotationIds: number[], addRows: boolean) => void;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddAnnotationDialog({ projectId, buttonProps, shouldOpen, ...props }: AddAnnotationDialogProps) {
  // local state
  const [open, setOpen] = useState(false);

  // global server state
  const metadata = MetadataHooks.useGetProjectMetadataList();

  // actions
  const handleOpen = () => {
    setOpen(shouldOpen());
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button onClick={handleOpen} {...buttonProps}>
        Add annotations
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth PaperProps={{ style: { height: "100%" } }}>
        {metadata.isSuccess ? (
          <AddAnnotationDialogContent onClose={handleClose} projectId={projectId} metadata={metadata.data} {...props} />
        ) : metadata.isLoading ? (
          <CircularProgress />
        ) : (
          <div>An error occured</div>
        )}
      </Dialog>
    </>
  );
}

interface AddAnnotationDialogContentProps {
  metadata: ProjectMetadataRead[];
  projectId: number;
  onConfirmSelection: (spanAnnotationIds: number[], addRows: boolean) => void;
  onClose: () => void;
}

function AddAnnotationDialogContent({
  metadata,
  projectId,
  onConfirmSelection,
  onClose,
}: AddAnnotationDialogContentProps) {
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const [visibilityModel, setVisibilityModel] = useState<MRT_VisibilityState>(() =>
    metadata.reduce((acc, curr) => {
      return {
        ...acc,
        [curr.id]: false,
      };
    }, {}),
  );
  const selectedAnnotationIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  const handleConfirmSelection = (addRows: boolean) => () => {
    onConfirmSelection(selectedAnnotationIds, addRows);
    onClose();
  };

  return (
    <SpanAnnotationTable
      title="Select annotations to add to table"
      projectId={projectId}
      filterName={filterName}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={visibilityModel}
      onColumnVisibilityChange={setVisibilityModel as React.Dispatch<React.SetStateAction<MRT_VisibilityState>>}
      cardProps={{ elevation: 2, className: "myFlexFillAllContainer myFlexContainer" }}
      renderBottomToolbarCustomActions={() => (
        <>
          <Box flexGrow={1} />
          <Button onClick={onClose}>Close</Button>
          <Button onClick={handleConfirmSelection(false)} disabled={selectedAnnotationIds.length === 0}>
            Add {selectedAnnotationIds.length > 0 ? selectedAnnotationIds.length : null} Annotations to cell
          </Button>
          <Button onClick={handleConfirmSelection(true)} disabled={selectedAnnotationIds.length === 0}>
            Add {selectedAnnotationIds.length > 0 ? selectedAnnotationIds.length : null} Annotations as new rows below
            cell
          </Button>
        </>
      )}
    />
  );
}

export default AddAnnotationDialog;
