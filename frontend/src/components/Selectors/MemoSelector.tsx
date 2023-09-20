import { CircularProgress } from "@mui/material";
import { DataGrid, GridCallbackDetails, GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import { useState } from "react";
import ProjectHooks from "../../api/ProjectHooks";
import { MemoRead } from "../../api/openapi";
import { renderTextCellExpand } from "../DataGrid/renderTextCellExpand";
import AttachedObjectRenderer from "../DataGrid/AttachedObjectRenderer";

const columns: GridColDef[] = [
  {
    field: "id",
    headerName: "ID",
    flex: 1,
  },
  {
    field: "title",
    headerName: "Title",
    flex: 1,
  },
  {
    field: "content",
    headerName: "Content",
    flex: 2,
    renderCell: renderTextCellExpand,
  },
  {
    field: "attached_to",
    headerName: "Attached To",
    flex: 1,
    renderCell: (params) => {
      return (
        <AttachedObjectRenderer
          attachedObjectId={params.row.attached_object_id}
          attachedObjectType={params.row.attached_object_type}
        />
      );
    },
  },
];

interface MemoSelectorProps {
  projectId: number;
  userId: number;
  setSelectedMemos: (tags: MemoRead[]) => void;
}

function MemoSelector({ projectId, userId, setSelectedMemos }: MemoSelectorProps) {
  // local state
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);

  // global server state
  const userMemos = ProjectHooks.useGetAllUserMemos(projectId, userId);

  // events
  const onSelectionChange = (selectionModel: GridRowSelectionModel, details: GridCallbackDetails<any>) => {
    if (!userMemos.data) return;
    setSelectionModel(selectionModel);
    // todo: this is probably very inefficient
    setSelectedMemos(userMemos.data.filter((memo) => selectionModel.indexOf(memo.id) !== -1));
  };

  return (
    <div style={{ height: 400, width: "100%" }}>
      {userMemos.isLoading && <CircularProgress />}
      {userMemos.isError && <div>Error</div>}
      {userMemos.isSuccess && (
        <DataGrid
          rows={userMemos.data}
          columns={columns}
          autoPageSize
          getRowId={(row) => row.id}
          checkboxSelection
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={onSelectionChange}
        />
      )}
    </div>
  );
}
export default MemoSelector;
