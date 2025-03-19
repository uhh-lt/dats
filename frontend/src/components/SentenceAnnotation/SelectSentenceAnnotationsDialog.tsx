import { Box, Button, ButtonProps, CircularProgress, Dialog } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { memo, useCallback, useState } from "react";
import MetadataHooks from "../../api/MetadataHooks.ts";
import { ProjectMetadataRead } from "../../api/openapi/models/ProjectMetadataRead.ts";
import { SentAnnoColumns } from "../../api/openapi/models/SentAnnoColumns.ts";
import SentenceAnnotationTable from "./SentenceAnnotationTable/SentenceAnnotationTable.tsx";

const filterName = "selectSentenceAnnotationDialog";

interface SelectSentenceAnnotationsDialogProps {
  title: string;
  projectId: number;
  onConfirmSelection: (annotationIds: number[]) => void;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function SelectSentenceAnnotationsDialog({ projectId, buttonProps, ...props }: SelectSentenceAnnotationsDialogProps) {
  // local state
  const [open, setOpen] = useState(false);

  // global server state
  const metadata = MetadataHooks.useGetProjectMetadataList();

  // actions
  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <Button onClick={handleOpen} {...buttonProps}>
        Select annotations
      </Button>
      <Dialog
        onClose={handleClose}
        open={open}
        maxWidth="lg"
        fullWidth
        slotProps={{ paper: { style: { height: "100%" } } }}
      >
        {metadata.isSuccess ? (
          <SelectSentenceAnnotationsDialogContent
            onClose={handleClose}
            projectId={projectId}
            metadata={metadata.data}
            {...props}
          />
        ) : metadata.isLoading ? (
          <CircularProgress />
        ) : (
          <div>An error occured</div>
        )}
      </Dialog>
    </>
  );
}

interface SelectSentenceAnnotationsDialogContentProps extends SelectSentenceAnnotationsDialogProps {
  onClose: () => void;
  metadata: ProjectMetadataRead[];
}

function SelectSentenceAnnotationsDialogContent({
  title,
  metadata,
  projectId,
  onConfirmSelection,
  onClose,
}: SelectSentenceAnnotationsDialogContentProps) {
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const [visibilityModel, setVisibilityModel] = useState<MRT_VisibilityState>(() =>
    // init visibility (disable metadata)
    metadata.reduce(
      (acc, curr) => {
        return {
          ...acc,
          [curr.id]: false,
        };
      },
      {
        [SentAnnoColumns.SENT_ANNO_MEMO_CONTENT]: false,
        [SentAnnoColumns.SENT_ANNO_DOCUMENT_DOCUMENT_TAG_ID_LIST]: false,
      },
    ),
  );

  // actions
  const handleClose = useCallback(() => {
    onClose();
    setRowSelectionModel({});
  }, [onClose]);

  const handleConfirmSelection = useCallback(() => {
    const selectedAnnotationIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));
    onConfirmSelection(selectedAnnotationIds);
    handleClose();
  }, [handleClose, onConfirmSelection, rowSelectionModel]);

  return (
    <SentenceAnnotationTable
      title={title}
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
            Select {props.selectedAnnotations.length > 0 ? props.selectedAnnotations.length : null} Annotation
            {props.selectedAnnotations.length > 1 ? "s" : ""}
          </Button>
        </>
      )}
    />
  );
}

export default memo(SelectSentenceAnnotationsDialog);
