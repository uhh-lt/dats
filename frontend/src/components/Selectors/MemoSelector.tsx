import Button from "@mui/material/Button/Button";
import Stack from "@mui/material/Stack/Stack";
import { MRT_ColumnDef, MRT_RowSelectionState, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { useMemo, useState } from "react";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import { attachedObjectTypeToText } from "../../features/Memo/attachedObjectTypeToText.ts";
import AttachedObjectRenderer from "../DataGrid/AttachedObjectRenderer.tsx";

interface MemoSelectorRow extends MemoRead {
  attachedObjectType: string;
}

const rowSelectionModelToIds = (rowSelectionModel: MRT_RowSelectionState) => {
  return Object.entries(rowSelectionModel)
    .filter(([, selected]) => selected)
    .map(([id]) => parseInt(id));
};

const columns: MRT_ColumnDef<MemoSelectorRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "content",
    header: "Content",
  },
  {
    accessorKey: "attachedObjectType",
    header: "Attached Type",
  },
  {
    accessorKey: "attached_object_id",
    header: "Attached To",
    enableColumnFilter: false,
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
  onAddMemos?: (memos: MemoRead[]) => void;
}

function MemoSelector({ projectId, userId, onAddMemos }: MemoSelectorProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global server state
  const userMemos = ProjectHooks.useGetAllUserMemos(projectId, userId);

  // computed
  const { userMemosMap, userMemoRows } = useMemo(() => {
    // we have to transform the data, better do this elsewhere?
    if (!userMemos.data) return { userMemosMap: {}, userMemoRows: [] };

    const userMemosMap = userMemos.data.reduce(
      (acc, userMemo) => {
        acc[userMemo.id.toString()] = userMemo;
        return acc;
      },
      {} as Record<string, MemoRead>,
    );

    const userMemoRows = userMemos.data.map((userMemo) => ({
      ...userMemo,
      attachedObjectType: attachedObjectTypeToText[userMemo.attached_object_type],
    }));

    return { userMemosMap, userMemoRows };
  }, [userMemos.data]);

  // table
  const table = useMaterialReactTable({
    data: userMemoRows,
    columns: columns,
    getRowId: (row) => `${row.id}`,
    // style
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      style: { flexGrow: 1 },
    },
    // state
    state: {
      isLoading: userMemos.isLoading,
      showAlertBanner: userMemos.isError,
      showProgressBars: userMemos.isFetching,
      rowSelection: rowSelectionModel,
    },
    // handle error
    muiToolbarAlertBannerProps: userMemos.isError
      ? {
          color: "error",
          children: userMemos.error.message,
        }
      : undefined,
    // virtualization (scrolling instead of pagination)
    enablePagination: false,
    enableRowVirtualization: true,
    enableBottomToolbar: false,
    // selection
    enableRowSelection: true,
    onRowSelectionChange: setRowSelectionModel,
    renderToolbarAlertBannerContent({ selectedAlert }) {
      return (
        <Stack direction="row" gap="1rem" style={{ padding: "0.4rem 1rem" }}>
          {selectedAlert}
          {onAddMemos && (
            <Button
              style={{ padding: 0 }}
              size="small"
              onClick={() => {
                const selectedMemos = rowSelectionModelToIds(rowSelectionModel).map((id) => userMemosMap[id]);
                onAddMemos(selectedMemos);
              }}
            >
              Add Memos
            </Button>
          )}
        </Stack>
      );
    },
    // hide columns per default
    initialState: {
      columnVisibility: {
        id: false,
      },
    },
  });

  return <MaterialReactTable table={table} />;
}
export default MemoSelector;
