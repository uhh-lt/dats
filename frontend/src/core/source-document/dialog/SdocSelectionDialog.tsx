import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FilterTableToolbarProps } from "@core/filter";
import { ProjectMetadataHooks } from "@core/project-metadata";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { HierarchicalElasticSearchHit } from "@models/HierarchicalElasticSearchHit";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { Button, ButtonProps, CircularProgress, Dialog } from "@mui/material";
import { closeOnEscape } from "@utils/dialogUtils";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useState } from "react";
import { SdocReduxFilterTable } from "../table";

interface SdocSelectionDialogProps {
  projectId: number;
  // the redux filter of the document table, one per place that selects documents
  filterName: string;
  title: string;
  sdocIds: number[];
  onChange: (sdocIds: number[]) => void;
  // the props of the trigger button, labelled "Documents (n)"
  buttonProps?: Omit<ButtonProps, "onClick">;
}

/** Selects documents in the document table with the usual filters, starting with the given selection. */
export function SdocSelectionDialog({
  projectId,
  filterName,
  title,
  sdocIds,
  onChange,
  buttonProps,
}: SdocSelectionDialogProps) {
  // dialog state
  const { isOpen, open: handleOpen, close: handleClose } = useDialog();

  // global server state
  const metadata = ProjectMetadataHooks.useGetAllProjectMetadata();

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <>
      <Button sx={{ flexShrink: 0 }} {...buttonProps} onClick={handleOpen}>
        Documents ({sdocIds.length})
      </Button>
      <Dialog open={isOpen} onClose={closeOnEscape(handleClose)} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        <DATSDialogHeader
          title={title}
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        {metadata.isSuccess ? (
          <SdocSelectionDialogContent
            projectId={projectId}
            filterName={filterName}
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

interface SdocSelectionDialogContentProps extends Omit<SdocSelectionDialogProps, "title" | "buttonProps"> {
  metadata: ProjectMetadataRead[];
  onClose: () => void;
}

function SdocSelectionDialogContent({
  projectId,
  filterName,
  sdocIds,
  metadata,
  onChange,
  onClose,
}: SdocSelectionDialogContentProps) {
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
