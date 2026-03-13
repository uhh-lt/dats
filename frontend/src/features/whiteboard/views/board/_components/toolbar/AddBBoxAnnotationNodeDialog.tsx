import { MetadataHooks } from "@api/hooks/MetadataHooks";
import { BBoxColumns } from "@api/models/BBoxColumns";
import { ProjectMetadataRead } from "@api/models/ProjectMetadataRead";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { BBoxAnnotationTable } from "@core/bbox-annotation";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { Button, ButtonProps, CircularProgress, Dialog, Tooltip } from "@mui/material";
import { getIconComponent, Icon } from "@utils/icons/iconUtils";
import { XYPosition } from "@xyflow/react";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { memo, useCallback, useMemo, useState } from "react";
import { ReactFlowService } from "../../_hooks/ReactFlowService";
import { AddNodeDialogProps } from "../../_types/AddNodeDialogProps";
import { PendingAddNodeAction } from "../../_types/PendingAddNodeAction";
import { createBBoxAnnotationNodes } from "../../_utils/whiteboardUtils";

const filterName = "bboxAnnotationDialogWhiteboard";

export interface AddBBoxAnnotationNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

export const AddBBoxAnnotationNodeDialog = memo(
  ({ projectId, buttonProps, ...props }: AddBBoxAnnotationNodeDialogProps) => {
    // dialog state
    const dialog = useDialog();
    const { isMaximized, toggleMaximize } = useDialogMaximize();

    // global server state
    const metadata = MetadataHooks.useGetProjectMetadataList();

    return (
      <>
        <Tooltip title="Add bbox annotations" placement="right" arrow>
          <Button onClick={dialog.open} {...buttonProps}>
            {getIconComponent(Icon.BBOX_ANNOTATION)}
          </Button>
        </Tooltip>
        <Dialog onClose={dialog.close} open={dialog.isOpen} maxWidth="lg" fullWidth fullScreen={isMaximized}>
          {metadata.isSuccess ? (
            <>
              <DATSDialogHeader
                title="Select bbox annotations to add to Whiteboard"
                onClose={dialog.close}
                isMaximized={isMaximized}
                onToggleMaximize={toggleMaximize}
              />
              <AddBBoxAnnotationNodeDialogContent
                onClose={dialog.close}
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
  },
);

const AddBBoxAnnotationNodeDialogContent = memo(function AddBBoxAnnotationNodeDialogContent({
  metadata,
  projectId,
  onClick,
  onClose,
}: AddBBoxAnnotationNodeDialogProps & { onClose: () => void; metadata: ProjectMetadataRead[] }) {
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
        [BBoxColumns.BB_MEMO_CONTENT]: false,
      },
    ),
  );

  // memoized selected annotation ids
  const selectedAnnotationIds = useMemo(
    () => Object.keys(rowSelectionModel).map((id) => parseInt(id)),
    [rowSelectionModel],
  );

  // memoized handlers
  const handleClose = useCallback(() => {
    onClose();
    setRowSelectionModel({});
  }, [onClose]);

  const handleConfirmSelection = useCallback(() => {
    const bboxAnnotations = selectedAnnotationIds;
    const addNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createBBoxAnnotationNodes({ bboxAnnotations, position }));
    onClick(addNode);
    handleClose();
  }, [selectedAnnotationIds, onClick, handleClose]);

  const renderBottomToolbarActions = useCallback(
    () => (
      <Button onClick={handleConfirmSelection} disabled={selectedAnnotationIds.length === 0}>
        Add {selectedAnnotationIds.length > 0 ? selectedAnnotationIds.length : null} Annotations
      </Button>
    ),
    [handleConfirmSelection, selectedAnnotationIds.length],
  );

  return (
    <BBoxAnnotationTable
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
      renderBottomToolbar={renderBottomToolbarActions}
    />
  );
});
