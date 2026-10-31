import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FilterTableToolbarProps } from "@core/filter";
import { ProjectMetadataHooks } from "@core/project-metadata";
import { SdocReduxFilterTable } from "@core/source-document";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { HierarchicalElasticSearchHit } from "@models/HierarchicalElasticSearchHit";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { Button, CircularProgress, Dialog } from "@mui/material";
import { closeOnEscape } from "@utils/dialogUtils";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useState } from "react";

const filterName = "promptPreviewDocuments";

interface PreviewDocumentsDialogProps {
  projectId: number;
  sdocIds: number[];
  onChange: (sdocIds: number[]) => void;
}

/** Selects the documents that the prompt editor previews its draft for. */
export function PreviewDocumentsDialog({ projectId, sdocIds, onChange }: PreviewDocumentsDialogProps) {
  // dialog state
  const { isOpen, open: handleOpen, close: handleClose } = useDialog();

  // global server state
  const metadata = ProjectMetadataHooks.useGetAllProjectMetadata();

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <>
      <Button onClick={handleOpen} sx={{ flexShrink: 0 }}>
        Documents ({sdocIds.length})
      </Button>
      <Dialog open={isOpen} onClose={closeOnEscape(handleClose)} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        <DATSDialogHeader
          title="Select documents to preview the prompt"
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        {metadata.isSuccess ? (
          <PreviewDocumentsDialogContent
            projectId={projectId}
            sdocIds={sdocIds}
            metadata={metadata.data}
            onChange={onChange}
            onClose={handleClose}
          />
        ) : metadata.isLoading ? (
          <CircularProgress />
        ) : (
          <div>An error occurred</div>
        )}
      </Dialog>
    </>
  );
}

interface PreviewDocumentsDialogContentProps extends PreviewDocumentsDialogProps {
  metadata: ProjectMetadataRead[];
  onClose: () => void;
}

function PreviewDocumentsDialogContent({
  projectId,
  sdocIds,
  metadata,
  onChange,
  onClose,
}: PreviewDocumentsDialogContentProps) {
  // local state, starting with the current selection
  const [fetchSize, setFetchSize] = useState(20);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>(() =>
    Object.fromEntries(sdocIds.map((sdocId) => [sdocId, true])),
  );
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const [visibilityModel, setVisibilityModel] = useState<MRT_VisibilityState>(() =>
    // init visibility (disable metadata)
    metadata.reduce((acc, curr) => ({ ...acc, [curr.id]: false }), {}),
  );

  const handleConfirmSelection = useCallback(() => {
    onChange(Object.keys(rowSelectionModel).map((id) => parseInt(id)));
    onClose();
  }, [onChange, onClose, rowSelectionModel]);

  const renderBottomToolbar = useCallback(
    (props: FilterTableToolbarProps<HierarchicalElasticSearchHit>) => (
      <Button onClick={handleConfirmSelection}>Use {props.selectedData.length} document(s)</Button>
    ),
    [handleConfirmSelection],
  );

  return (
    <SdocReduxFilterTable
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
