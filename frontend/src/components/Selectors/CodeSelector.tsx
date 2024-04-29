import { Button, Stack } from "@mui/material";
import { MRT_ColumnDef, MRT_RowSelectionState, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { useMemo, useState } from "react";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";

import SquareIcon from "@mui/icons-material/Square";

const rowSelectionModelToIds = (rowSelectionModel: MRT_RowSelectionState) => {
  return Object.entries(rowSelectionModel)
    .filter(([, selected]) => selected)
    .map(([id]) => parseInt(id));
};

const createDataTree = (dataset: CodeRead[]): CodeSelectorRow[] => {
  const hashTable: Record<number, CodeSelectorRow> = Object.create(null);
  dataset.forEach((data) => (hashTable[data.id] = { ...data, subRows: [] }));

  const dataTree: CodeSelectorRow[] = [];
  dataset.forEach((data) => {
    if (data.parent_code_id) hashTable[data.parent_code_id].subRows.push(hashTable[data.id]);
    else dataTree.push(hashTable[data.id]);
  });
  return dataTree;
};

interface CodeSelectorRow extends CodeRead {
  subRows: CodeSelectorRow[];
}

const columns: MRT_ColumnDef<CodeSelectorRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "color",
    header: "Color",
    enableColumnFilter: false,
    Cell: ({ row }) => {
      return <SquareIcon style={{ color: row.original.color, blockSize: 24 }} />;
    },
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
];

interface CodeSelectorProps {
  projectId: number;
  onAddCodes?: (codes: CodeRead[]) => void;
}

function CodeSelector({ projectId, onAddCodes }: CodeSelectorProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global server state
  const projectCodes = ProjectHooks.useGetAllCodes(projectId);

  // computed
  const { projectCodesMap, projectCodesRows } = useMemo(() => {
    // we have to transform the data, better do this elsewhere?
    if (!projectCodes.data) return { projectCodesMap: {}, projectCodesRows: [] };

    const projectCodesMap = projectCodes.data.reduce(
      (acc, projectCode) => {
        acc[projectCode.id.toString()] = projectCode;
        return acc;
      },
      {} as Record<string, CodeRead>,
    );

    const projectCodesRows = createDataTree(projectCodes.data);

    return { projectCodesMap, projectCodesRows };
  }, [projectCodes.data]);

  // table
  const table = useMaterialReactTable({
    data: projectCodesRows,
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
      isLoading: projectCodes.isLoading,
      showAlertBanner: Object.keys(rowSelectionModel).length > 0 || projectCodes.isError,
      showProgressBars: projectCodes.isFetching,
      rowSelection: rowSelectionModel,
    },
    // handle error
    muiToolbarAlertBannerProps: projectCodes.isError
      ? {
          color: "error",
          children: projectCodes.error.message,
        }
      : undefined,
    // virtualization (scrolling instead of pagination)
    enablePagination: false,
    enableRowVirtualization: true,
    enableBottomToolbar: false,
    // selection
    enableRowSelection: true,
    onRowSelectionChange: setRowSelectionModel,
    renderToolbarAlertBannerContent() {
      return (
        <Stack direction="row" gap="1rem" style={{ padding: "0.4rem 1rem" }}>
          {Object.keys(rowSelectionModel).length} of {Object.keys(projectCodesMap).length} codes(s) selected
          <Button style={{ padding: 0 }} size="small" onClick={() => setRowSelectionModel({})}>
            Clear selection
          </Button>
          {onAddCodes && (
            <Button
              style={{ padding: 0 }}
              size="small"
              onClick={() => {
                const selectedCodes = rowSelectionModelToIds(rowSelectionModel).map((id) => projectCodesMap[id]);
                onAddCodes(selectedCodes);
              }}
            >
              Add Codes
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
    // tree structure
    enableExpanding: true,
    getSubRows: (originalRow) => originalRow.subRows,
    filterFromLeafRows: true, //search for child rows and preserve parent rows
    enableSubRowSelection: false,
  });

  return <MaterialReactTable table={table} />;
}
export default CodeSelector;
