import { Button, ButtonProps, CircularProgress, Dialog } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { memo, useCallback, useState } from "react";
import MetadataHooks from "../../api/MetadataHooks.ts";
import { ProjectMetadataRead } from "../../api/openapi/models/ProjectMetadataRead.ts";
import { SentAnnoColumns } from "../../api/openapi/models/SentAnnoColumns.ts";
import { SentenceAnnotationRow } from "../../api/openapi/models/SentenceAnnotationRow.ts";
import { FilterTableToolbarProps } from "../FilterTable/FilterTableToolbarProps.ts";
import DATSDialogHeader from "../MUI/DATSDialogHeader.tsx";
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

  // maximize dialog
  const [isMaximized, setIsMaximized] = useState(false);
  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  return (
    <>
      <Button onClick={handleOpen} {...buttonProps}>
        Select annotations
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        {metadata.isSuccess ? (
          <>
            <DATSDialogHeader
              title="Select sentence annotations to add to Whiteboard"
              onClose={handleClose}
              isMaximized={isMaximized}
              onToggleMaximize={handleToggleMaximize}
            />
            <SelectSentenceAnnotationsDialogContent
              onClose={handleClose}
              projectId={projectId}
              metadata={metadata.data}
              {...props}
            />
          </>
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
  metadata,
  projectId,
  onConfirmSelection,
  onClose,
}: SelectSentenceAnnotationsDialogContentProps) {
  const [fetchSize, setFetchSize] = useState(20);
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

  // rendering
  const renderBottomToolbar = useCallback(
    (props: FilterTableToolbarProps<SentenceAnnotationRow>) => (
      <Button onClick={handleConfirmSelection} disabled={props.selectedData.length === 0}>
        Select {props.selectedData.length > 0 ? props.selectedData.length : null} Annotation
        {props.selectedData.length > 1 ? "s" : ""}
      </Button>
    ),
    [handleConfirmSelection],
  );

  return (
    <SentenceAnnotationTable
      projectId={projectId}
      filterName={filterName}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={visibilityModel}
      onColumnVisibilityChange={setVisibilityModel}
      fetchSize={fetchSize}
      onFetchSizeChange={setFetchSize}
      renderBottomToolbar={renderBottomToolbar}
    />
  );
}

export default memo(SelectSentenceAnnotationsDialog);
