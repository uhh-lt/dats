import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { getIconComponent, Icon } from "@components/icons";
import { FilterTableToolbarProps } from "@core/filter";
import { ProjectMetadataHooks } from "@core/project-metadata";
import { SpanAnnotationReduxFilterTable } from "@core/span-annotation";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { SpanAnnotationRow } from "@models/SpanAnnotationRow";
import { SpanColumns } from "@models/SpanColumns";
import { Button, CircularProgress, Dialog, Tooltip } from "@mui/material";
import { XYPosition } from "@xyflow/react";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useState } from "react";
import { ReactFlowService } from "../../_hooks/ReactFlowService";
import { AddNodeDialogProps } from "../../_types/AddNodeDialogProps";
import { PendingAddNodeAction } from "../../_types/PendingAddNodeAction";
import { createSpanAnnotationNodes } from "../../_utils/whiteboardUtils";
import { closeOnEscape } from "@utils/dialogUtils";

const filterName = "spanAnnotationDialogWhiteboard";

interface AddSpanAnnotationNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
}

export function AddSpanAnnotationNodeDialog({ projectId, buttonProps, ...props }: AddSpanAnnotationNodeDialogProps) {
  // dialog state
  const { isOpen, open: handleOpen, close: handleClose } = useDialog();
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // global server state
  const metadata = ProjectMetadataHooks.useGetAllProjectMetadata();

  return (
    <>
      <Tooltip title="Add span annotations" placement="right" arrow>
        <Button onClick={handleOpen} {...buttonProps}>
          {getIconComponent(Icon.SPAN_ANNOTATION)}
        </Button>
      </Tooltip>
      <Dialog open={isOpen} onClose={closeOnEscape(handleClose)} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        {metadata.isSuccess ? (
          <>
            <DATSDialogHeader
              title="Select span annotations to add to Whiteboard"
              onClose={handleClose}
              isMaximized={isMaximized}
              onToggleMaximize={toggleMaximize}
            />
            <AddSpanAnnotationNodeDialogContent
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

function AddSpanAnnotationNodeDialogContent({
  metadata,
  projectId,
  onClick,
  onClose,
}: AddSpanAnnotationNodeDialogProps & { onClose: () => void; metadata: ProjectMetadataRead[] }) {
  // local state
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
        [SpanColumns.SP_MEMO_CONTENT]: false,
      },
    ),
  );
  const selectedAnnotationIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  // actions
  const handleClose = useCallback(() => {
    onClose();
    setRowSelectionModel({});
  }, [onClose]);

  const handleConfirmSelection = useCallback(() => {
    const spanAnnotations = selectedAnnotationIds;
    const addNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createSpanAnnotationNodes({ spanAnnotations, position }));
    onClick(addNode);
    handleClose();
  }, [handleClose, onClick, selectedAnnotationIds]);

  // rendering
  const renderBottomToolbar = useCallback(
    (props: FilterTableToolbarProps<SpanAnnotationRow>) => (
      <Button onClick={handleConfirmSelection} disabled={props.selectedData.length === 0}>
        Add {props.selectedData.length > 0 ? props.selectedData.length : null} Annotations
      </Button>
    ),
    [handleConfirmSelection],
  );

  return (
    <SpanAnnotationReduxFilterTable
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
