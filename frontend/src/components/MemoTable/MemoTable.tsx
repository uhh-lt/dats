import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_TableInstance,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo } from "react";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import { useAuth } from "../../auth/useAuth.ts";
import { attachedObjectTypeToText } from "../../features/Memo/attachedObjectTypeToText.ts";
import AttachedObjectRenderer from "../DataGrid/AttachedObjectRenderer.tsx";

interface MemoTableRow extends MemoRead {
  attachedObjectType: string;
}

const columns: MRT_ColumnDef<MemoTableRow>[] = [
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

export interface MemoTableActionProps {
  table: MRT_TableInstance<MemoTableRow>;
  selectedMemos: MemoRead[];
}

interface MemoTableProps {
  projectId: number;
  // selection
  enableMultiRowSelection?: boolean;
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: (rowSelectionModel: MRT_RowSelectionState) => void;
  // toolbar
  renderToolbarInternalActions?: (props: MemoTableActionProps) => React.ReactNode;
  renderTopToolbarCustomActions?: (props: MemoTableActionProps) => React.ReactNode;
  renderBottomToolbar?: (props: MemoTableActionProps) => React.ReactNode;
}

function MemoTable({
  projectId,
  enableMultiRowSelection = true,
  rowSelectionModel,
  onRowSelectionChange,
  renderToolbarInternalActions,
  renderTopToolbarCustomActions,
  renderBottomToolbar,
}: MemoTableProps) {
  // global client state (react router)
  const { user } = useAuth();

  // global server state
  const userMemos = ProjectHooks.useGetAllUserMemos(projectId, user?.id);

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
      rowSelection: rowSelectionModel,
      isLoading: userMemos.isLoading,
      showAlertBanner: userMemos.isError,
      showProgressBars: userMemos.isFetching,
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
    // selection
    enableRowSelection: true,
    enableMultiRowSelection: enableMultiRowSelection,
    onRowSelectionChange: (rowSelectionUpdater) => {
      let newRowSelectionModel: MRT_RowSelectionState;
      if (typeof rowSelectionUpdater === "function") {
        newRowSelectionModel = rowSelectionUpdater(rowSelectionModel);
      } else {
        newRowSelectionModel = rowSelectionUpdater;
      }
      onRowSelectionChange(newRowSelectionModel);
    },
    // toolbar
    enableBottomToolbar: true,
    renderTopToolbarCustomActions: renderTopToolbarCustomActions
      ? (props) =>
          renderTopToolbarCustomActions({
            table: props.table,
            selectedMemos: Object.keys(rowSelectionModel).map((memoId) => userMemosMap[memoId]),
          })
      : undefined,
    renderToolbarInternalActions: renderToolbarInternalActions
      ? (props) =>
          renderToolbarInternalActions({
            table: props.table,
            selectedMemos: Object.values(userMemosMap).filter((row) => rowSelectionModel[row.id]),
          })
      : undefined,
    renderBottomToolbar: renderBottomToolbar
      ? (props) =>
          renderBottomToolbar({
            table: props.table,
            selectedMemos: Object.values(userMemosMap).filter((row) => rowSelectionModel[row.id]),
          })
      : undefined,
    // hide columns per default
    initialState: {
      columnVisibility: {
        id: false,
      },
    },
  });

  return <MaterialReactTable table={table} />;
}
export default MemoTable;
