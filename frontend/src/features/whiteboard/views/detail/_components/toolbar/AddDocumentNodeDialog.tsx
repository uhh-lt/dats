import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { getIconComponent, Icon } from "@components/icons";
import { FilterTableToolbarProps } from "@core/filter";
import { ProjectMetadataHooks } from "@core/project-metadata";
import { SdocReduxFilterTable } from "@core/source-document";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { HierarchicalElasticSearchHit } from "@models/HierarchicalElasticSearchHit";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { Button, CircularProgress, Dialog, Tooltip } from "@mui/material";
import { XYPosition } from "@xyflow/react";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useState } from "react";
import { ReactFlowService } from "../../_hooks/ReactFlowService";
import { AddNodeDialogProps } from "../../_types/AddNodeDialogProps";
import { createSdocNodes } from "../../_utils/whiteboardUtils";
import { closeOnEscape } from "@utils/dialogUtils";

const filterName = "documentDialogWhiteboard";

interface AddDocumentNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
}

export function AddDocumentNodeDialog({ projectId, buttonProps, ...props }: AddDocumentNodeDialogProps) {
  // local state
  const { isOpen, open: handleOpen, close: handleClose } = useDialog();

  // global server state
  const metadata = ProjectMetadataHooks.useGetAllProjectMetadata();

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <>
      <Tooltip title="Add document" placement="right" arrow>
        <Button onClick={handleOpen} {...buttonProps}>
          {getIconComponent(Icon.DOCUMENT)}
        </Button>
      </Tooltip>
      <Dialog open={isOpen} onClose={closeOnEscape(handleClose)} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        {metadata.isSuccess ? (
          <>
            <DATSDialogHeader
              title="Select documents to add to Whiteboard"
              onClose={handleClose}
              isMaximized={isMaximized}
              onToggleMaximize={toggleMaximize}
            />
            <AddDocumentNodeDialogContent
              onClose={handleClose}
              projectId={projectId}
              metadata={metadata.data}
              {...props}
            />
          </>
        ) : metadata.isLoading ? (
          <CircularProgress />
        ) : (
          <div>An error occurred</div>
        )}
      </Dialog>
    </>
  );
}

function AddDocumentNodeDialogContent({
  metadata,
  projectId,
  onClick,
  onClose,
}: AddDocumentNodeDialogProps & { onClose: () => void; metadata: ProjectMetadataRead[] }) {
  // local state
  const [fetchSize, setFetchSize] = useState(20);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const [visibilityModel, setVisibilityModel] = useState<MRT_VisibilityState>(() =>
    // init visibility (disable metadata)
    metadata.reduce((acc, curr) => {
      return {
        ...acc,
        [curr.id]: false,
      };
    }, {}),
  );
  const selectedSdocIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  // actions
  const handleClose = useCallback(() => {
    onClose();
    setRowSelectionModel({});
  }, [onClose]);

  const handleConfirmSelection = useCallback(() => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createSdocNodes({ sdocs: selectedSdocIds, position: position }));
    onClick(addNode);
    handleClose();
  }, [handleClose, onClick, selectedSdocIds]);

  // rendering
  const renderBottomToolbar = useCallback(
    (props: FilterTableToolbarProps<HierarchicalElasticSearchHit>) => (
      <Button onClick={handleConfirmSelection} disabled={props.selectedData.length === 0}>
        Add {props.selectedData.length > 0 ? props.selectedData.length : null} Documents
      </Button>
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
