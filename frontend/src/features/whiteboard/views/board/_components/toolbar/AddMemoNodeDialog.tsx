import { MetadataHooks } from "@api/hooks/MetadataHooks";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { getIconComponent, Icon } from "@components/icons";
import { FilterTableToolbarProps } from "@core/filter";
import { MemoReduxFilterTable } from "@core/memo";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { ElasticSearchHit } from "@models/ElasticSearchHit";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { Button, ButtonProps, CircularProgress, Dialog, Tooltip } from "@mui/material";
import { XYPosition } from "@xyflow/react";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useState } from "react";
import { ReactFlowService } from "../../_hooks/ReactFlowService";
import { AddNodeDialogProps } from "../../_types/AddNodeDialogProps";
import { PendingAddNodeAction } from "../../_types/PendingAddNodeAction";
import { createMemoNodes } from "../../_utils/whiteboardUtils";

const filterName = "memoDialogWhiteboard";

export interface AddMemoNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

export function AddMemoNodeDialog({ projectId, buttonProps, ...props }: AddMemoNodeDialogProps) {
  // dialog state
  const dialog = useDialog();
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // global server state
  const metadata = MetadataHooks.useGetProjectMetadataList();

  return (
    <>
      <Tooltip title="Add memos" placement="right" arrow>
        <Button onClick={dialog.open} {...buttonProps}>
          {getIconComponent(Icon.MEMO)}
        </Button>
      </Tooltip>
      <Dialog open={dialog.isOpen} onClose={dialog.close} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        {metadata.isSuccess ? (
          <>
            <DATSDialogHeader
              title="Select memos to add to Whiteboard"
              onClose={dialog.close}
              isMaximized={isMaximized}
              onToggleMaximize={toggleMaximize}
            />
            <AddMemoNodeDialogContent
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
}

function AddMemoNodeDialogContent({
  metadata,
  projectId,
  onClick,
  onClose,
}: AddMemoNodeDialogProps & { onClose: () => void; metadata: ProjectMetadataRead[] }) {
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

  const selectedMemoIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  // actions
  const handleClose = useCallback(() => {
    onClose();
    setRowSelectionModel({});
  }, [onClose]);

  const handleConfirmSelection = useCallback(() => {
    const memos = selectedMemoIds;
    const addNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createMemoNodes({ memos, position }));
    onClick(addNode);
    handleClose();
  }, [handleClose, onClick, selectedMemoIds]);

  // rendering
  const renderBottomToolbar = useCallback(
    (props: FilterTableToolbarProps<ElasticSearchHit>) => (
      <Button onClick={handleConfirmSelection} disabled={props.selectedData.length === 0}>
        Add {props.selectedData.length > 0 ? props.selectedData.length : null} Memos
      </Button>
    ),
    [handleConfirmSelection],
  );

  return (
    <MemoReduxFilterTable
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
