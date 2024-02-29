import { CircularProgress } from "@mui/material";
import { MRT_ColumnDef, MRT_RowSelectionState, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { useMemo, useState } from "react";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import AttachedObjectRenderer from "../DataGrid/AttachedObjectRenderer.tsx";

const columns: MRT_ColumnDef<MemoRead>[] = [
  {
    accessorKey: "id",
    header: "ID",
    // flex: 1,
  },
  {
    accessorKey: "title",
    header: "Title",
    // flex: 1,
  },
  {
    accessorKey: "content",
    header: "Content",
    // flex: 2,
    // renderCell: renderTextCellExpand,
  },
  {
    accessorKey: "attached_to",
    header: "Attached To",
    // flex: 1,
    Cell: ({ row }) => {
      return (
        <AttachedObjectRenderer
          attachedObjectId={row.original.attached_object_id}
          attachedObjectType={row.original.attached_object_type}
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
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global server state
  const userMemos = ProjectHooks.useGetAllUserMemos(projectId, userId);

  // computed
  const userMemosMap = useMemo(() => {
    // we have to transform the data, better do this elsewhere?
    if (!userMemos.data) return {};

    return userMemos.data.reduce(
      (acc, userMemo) => {
        acc[userMemo.id.toString()] = userMemo;
        return acc;
      },
      {} as Record<string, MemoRead>,
    );
  }, [userMemos.data]);

  // table
  const table = useMaterialReactTable({
    data: userMemos.data || [],
    columns: columns,
    // autoPageSize
    // sx={{ border: "none" }}
    getRowId: (row) => row.id.toString(),
    // state
    state: {
      rowSelection: rowSelectionModel,
      isLoading: columns.length === 0,
    },
    // selection
    enableRowSelection: true,
    onRowSelectionChange: (rowSelectionUpdater) => {
      let newRowSelectionModel: MRT_RowSelectionState;
      if (typeof rowSelectionUpdater === "function") {
        newRowSelectionModel = rowSelectionUpdater(rowSelectionModel);
      } else {
        newRowSelectionModel = rowSelectionUpdater;
      }
      setRowSelectionModel(newRowSelectionModel);
      setSelectedMemos(
        Object.entries(newRowSelectionModel)
          .filter(([, selected]) => selected)
          .map(([memoId]) => userMemosMap[memoId]),
      );
    },
  });

  return (
    <div style={{ height: 400, width: "100%" }}>
      {userMemos.isLoading && <CircularProgress />}
      {userMemos.isError && <div>Error</div>}
      {userMemos.isSuccess && <MaterialReactTable table={table} />}
    </div>
  );
}
export default MemoSelector;
