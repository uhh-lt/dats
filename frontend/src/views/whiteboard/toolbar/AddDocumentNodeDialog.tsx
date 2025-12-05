import { Button, ButtonProps, CircularProgress, Dialog, Tooltip } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useState } from "react";
import { XYPosition } from "reactflow";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { ElasticSearchHit } from "../../../api/openapi/models/ElasticSearchHit.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import { FilterTableToolbarProps } from "../../../components/FilterTable/FilterTableToolbarProps.ts";
import DATSDialogHeader from "../../../components/MUI/DATSDialogHeader.tsx";
import SdocTable from "../../../components/SourceDocument/SdocTable/SdocTable.tsx";
import { useDialog } from "../../../hooks/useDialog.ts";
import { useDialogMaximize } from "../../../hooks/useDialogMaximize.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { createSdocNodes } from "../whiteboardUtils.ts";

const filterName = "documentDialogWhiteboard";

export interface AddDocumentNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddDocumentNodeDialog({ projectId, buttonProps, ...props }: AddDocumentNodeDialogProps) {
  // local state
  const dialog = useDialog();

  // global server state
  const metadata = MetadataHooks.useGetProjectMetadataList();

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <>
      <Tooltip title="Add document" placement="right" arrow>
        <Button onClick={dialog.open} {...buttonProps}>
          {getIconComponent(Icon.DOCUMENT)}
        </Button>
      </Tooltip>
      <Dialog onClose={dialog.close} open={dialog.isOpen} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        {metadata.isSuccess ? (
          <>
            <DATSDialogHeader
              title="Select documents to add to Whiteboard"
              onClose={dialog.close}
              isMaximized={isMaximized}
              onToggleMaximize={toggleMaximize}
            />
            <AddDocumentNodeDialogContent
              onClose={dialog.close}
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
    (props: FilterTableToolbarProps<ElasticSearchHit>) => (
      <Button onClick={handleConfirmSelection} disabled={props.selectedData.length === 0}>
        Add {props.selectedData.length > 0 ? props.selectedData.length : null} Documents
      </Button>
    ),
    [handleConfirmSelection],
  );

  return (
    <SdocTable
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

export default AddDocumentNodeDialog;
