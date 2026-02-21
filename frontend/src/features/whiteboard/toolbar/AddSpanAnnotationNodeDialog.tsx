import { Button, ButtonProps, CircularProgress, Dialog, Tooltip } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useState } from "react";
import { XYPosition } from "reactflow";
import { MetadataHooks } from "../../../api/MetadataHooks.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import { SpanAnnotationRow } from "../../../api/openapi/models/SpanAnnotationRow.ts";
import { SpanColumns } from "../../../api/openapi/models/SpanColumns.ts";
import { FilterTableToolbarProps } from "../../../components/FilterTable/FilterTableToolbarProps.ts";
import { DATSDialogHeader } from "../../../components/MUI/DATSDialogHeader.tsx";
import { SpanAnnotationTable } from "../../../core/span-annotation/table/SpanAnnotationTable.tsx";
import { useDialog } from "../../../hooks/useDialog.ts";
import { useDialogMaximize } from "../../../hooks/useDialogMaximize.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createSpanAnnotationNodes } from "../whiteboardUtils.ts";

const filterName = "spanAnnotationDialogWhiteboard";

interface AddSpanAnnotationNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

export function AddSpanAnnotationNodeDialog({ projectId, buttonProps, ...props }: AddSpanAnnotationNodeDialogProps) {
  // dialog state
  const dialog = useDialog();
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // global server state
  const metadata = MetadataHooks.useGetProjectMetadataList();

  return (
    <>
      <Tooltip title="Add span annotations" placement="right" arrow>
        <Button onClick={dialog.open} {...buttonProps}>
          {getIconComponent(Icon.SPAN_ANNOTATION)}
        </Button>
      </Tooltip>
      <Dialog open={dialog.isOpen} onClose={dialog.close} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        {metadata.isSuccess ? (
          <>
            <DATSDialogHeader
              title="Select span annotations to add to Whiteboard"
              onClose={dialog.close}
              isMaximized={isMaximized}
              onToggleMaximize={toggleMaximize}
            />
            <AddSpanAnnotationNodeDialogContent
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
    <SpanAnnotationTable
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
