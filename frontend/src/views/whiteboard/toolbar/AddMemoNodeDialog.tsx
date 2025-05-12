import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import { Button, ButtonProps, CircularProgress, Dialog } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useCallback, useState } from "react";
import { XYPosition } from "reactflow";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { ElasticSearchDocumentHit } from "../../../api/openapi/models/ElasticSearchDocumentHit.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import { FilterTableToolbarProps } from "../../../components/FilterTable/FilterTableToolbarProps.ts";
import DATSDialogHeader from "../../../components/MUI/DATSDialogHeader.tsx";
import MemoTable from "../../../components/Memo/MemoTable/MemoTable.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createMemoNodes } from "../whiteboardUtils.ts";

const filterName = "memoDialogWhiteboard";

export interface AddMemoNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddMemoNodeDialog({ projectId, buttonProps, ...props }: AddMemoNodeDialogProps) {
  // local state
  const [open, setOpen] = useState(false);

  // global server state
  const metadata = MetadataHooks.useGetProjectMetadataList();

  // actions
  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // maximize dialog
  const [isMaximized, setIsMaximized] = useState(false);
  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  return (
    <>
      <Button onClick={handleOpen} {...buttonProps}>
        <StickyNote2Icon />
      </Button>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth fullScreen={isMaximized}>
        {metadata.isSuccess ? (
          <>
            <DATSDialogHeader
              title="Select memos to add to Whiteboard"
              onClose={handleClose}
              isMaximized={isMaximized}
              onToggleMaximize={handleToggleMaximize}
            />
            <AddMemoNodeDialogContent onClose={handleClose} projectId={projectId} metadata={metadata.data} {...props} />
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
    (props: FilterTableToolbarProps<ElasticSearchDocumentHit>) => (
      <Button onClick={handleConfirmSelection} disabled={props.selectedData.length === 0}>
        Add {props.selectedData.length > 0 ? props.selectedData.length : null} Memos
      </Button>
    ),
    [handleConfirmSelection],
  );

  return (
    <MemoTable
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

export default AddMemoNodeDialog;
