import LabelIcon from "@mui/icons-material/Label";
import { Button, Stack } from "@mui/material";
import { MRT_ColumnDef, MRT_RowSelectionState, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { useMemo, useState } from "react";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";

const rowSelectionModelToIds = (rowSelectionModel: MRT_RowSelectionState) => {
  return Object.entries(rowSelectionModel)
    .filter(([, selected]) => selected)
    .map(([id]) => parseInt(id));
};

const createDataTree = (dataset: DocumentTagRead[]): TagSelectorRow[] => {
  const hashTable: Record<number, TagSelectorRow> = Object.create(null);
  dataset.forEach((data) => (hashTable[data.id] = { ...data, subRows: [] }));

  const dataTree: TagSelectorRow[] = [];
  dataset.forEach((data) => {
    if (data.parent_tag_id) hashTable[data.parent_tag_id].subRows.push(hashTable[data.id]);
    else dataTree.push(hashTable[data.id]);
  });
  return dataTree;
};

interface TagSelectorRow extends DocumentTagRead {
  subRows: TagSelectorRow[];
}

const columns: MRT_ColumnDef<TagSelectorRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "color",
    header: "Color",
    enableColumnFilter: false,
    Cell: ({ row }) => {
      return <LabelIcon style={{ color: row.original.color, blockSize: 24 }} />;
    },
  },
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
];

interface TagSelectorProps {
  projectId: number;
  onAddTags?: (tags: DocumentTagRead[]) => void;
}

function TagSelector({ projectId, onAddTags }: TagSelectorProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global server state
  const projectTags = ProjectHooks.useGetAllTags(projectId);

  // computed
  const { projectTagsMap, projectTagRows } = useMemo(() => {
    // we have to transform the data, better do this elsewhere?
    if (!projectTags.data) return { projectTagsMap: {}, projectTagRows: [] };

    const projectTagsMap = projectTags.data.reduce(
      (acc, projectTag) => {
        acc[projectTag.id.toString()] = projectTag;
        return acc;
      },
      {} as Record<string, DocumentTagRead>,
    );

    const projectTagRows = createDataTree(projectTags.data);

    return { projectTagsMap, projectTagRows };
  }, [projectTags.data]);

  // table
  const table = useMaterialReactTable({
    data: projectTagRows,
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
      isLoading: projectTags.isLoading,
      showAlertBanner: Object.keys(rowSelectionModel).length > 0 || projectTags.isError,
      showProgressBars: projectTags.isFetching,
      rowSelection: rowSelectionModel,
    },
    // handle error
    muiToolbarAlertBannerProps: projectTags.isError
      ? {
          color: "error",
          children: projectTags.error.message,
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
          {Object.keys(rowSelectionModel).length} of {Object.keys(projectTagsMap).length} tag(s) selected
          <Button style={{ padding: 0 }} size="small" onClick={() => setRowSelectionModel({})}>
            Clear selection
          </Button>
          {onAddTags && (
            <Button
              style={{ padding: 0 }}
              size="small"
              onClick={() => {
                const selectedTags = rowSelectionModelToIds(rowSelectionModel).map((id) => projectTagsMap[id]);
                onAddTags(selectedTags);
              }}
            >
              Add Tags
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
export default TagSelector;
