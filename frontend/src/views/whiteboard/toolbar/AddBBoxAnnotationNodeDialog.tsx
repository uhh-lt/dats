import { Button, ButtonProps, CircularProgress, Dialog, Tooltip } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { memo, useCallback, useMemo, useState } from "react";
import { XYPosition } from "reactflow";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { BBoxColumns } from "../../../api/openapi/models/BBoxColumns.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import BBoxAnnotationTable from "../../../components/BBoxAnnotation/BBoxAnnotationTable/BBoxAnnotationTable.tsx";
import DATSDialogHeader from "../../../components/MUI/DATSDialogHeader.tsx";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createBBoxAnnotationNodes } from "../whiteboardUtils.ts";

const filterName = "bboxAnnotationDialogWhiteboard";

export interface AddBBoxAnnotationNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddBBoxAnnotationNodeDialog({ projectId, buttonProps, ...props }: AddBBoxAnnotationNodeDialogProps) {
  // local state
  const [open, setOpen] = useState(false);

  // global server state
  const metadata = MetadataHooks.useGetProjectMetadataList();

  // memoized handlers
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
      <Tooltip title="Add bbox annotations" placement="right" arrow>
        <Button onClick={handleOpen} {...buttonProps}>
          {getIconComponent(Icon.BBOX_ANNOTATION)}
        </Button>
      </Tooltip>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        {metadata.isSuccess ? (
          <>
            <DATSDialogHeader
              title="Select bbox annotations to add to Whiteboard"
              onClose={handleClose}
              isMaximized={isMaximized}
              onToggleMaximize={handleToggleMaximize}
            />
            <AddBBoxAnnotationNodeDialogContent
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

export default memo(AddBBoxAnnotationNodeDialog);
