import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_TableInstance,
  MRT_TableOptions,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo } from "react";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import AttachedObjectRenderer from "./AttachedObjectRenderer.tsx";
import { attachedObjectTypeToText } from "./attachedObjectTypeToText.ts";

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
          attachedObject={row.original.attached_object_id}
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
  onRowSelectionChange: MRT_TableOptions<MemoTableRow>["onRowSelectionChange"];
  // toolbar
  renderToolbarInternalActions?: (props: MemoTableActionProps) => React.ReactNode;
  renderTopToolbarCustomActions?: (props: MemoTableActionProps) => React.ReactNode;
  renderBottomToolbarCustomActions?: (props: MemoTableActionProps) => React.ReactNode;
}

function MemoTable({
  projectId,
  enableMultiRowSelection = true,
  rowSelectionModel,
  onRowSelectionChange,
  renderToolbarInternalActions,
  renderTopToolbarCustomActions,
  renderBottomToolbarCustomActions,
}: MemoTableProps) {
  // global server state
  const userMemos = ProjectHooks.useGetAllUserMemos(projectId);

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
  const table = useMaterialReactTable<MemoTableRow>({
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
    onRowSelectionChange,
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
    renderBottomToolbarCustomActions: renderBottomToolbarCustomActions
      ? (props) =>
          renderBottomToolbarCustomActions({
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
