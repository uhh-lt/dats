import LabelIcon from "@mui/icons-material/Label";
import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_TableInstance,
  MRT_TableOptions,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { memo, useMemo } from "react";
import { TagRead } from "../../../api/openapi/models/TagRead.ts";
import { TagHooks } from "../../../api/TagHooks.ts";

const createDataTree = (dataset: TagRead[]): TagTableRow[] => {
  const hashTable: Record<number, TagTableRow> = Object.create(null);
  dataset.forEach((data) => (hashTable[data.id] = { ...data, subRows: [] }));

  const dataTree: TagTableRow[] = [];
  dataset.forEach((data) => {
    if (data.parent_id) hashTable[data.parent_id].subRows.push(hashTable[data.id]);
    else dataTree.push(hashTable[data.id]);
  });
  return dataTree;
};

interface TagTableRow extends TagRead {
  subRows: TagTableRow[];
}

const columns: MRT_ColumnDef<TagTableRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "color",
    header: "Color",
    enableColumnFilter: false,
    size: 120,
    grow: 0,
    Cell: ({ row }) => {
      return <LabelIcon style={{ color: row.original.color, blockSize: 24 }} />;
    },
  },
  {
    grow: 0,
    accessorKey: "name",
    header: "Name",
  },
  {
    grow: 1,
    accessorKey: "description",
    header: "Description",
  },
];

export interface TagTableActionProps {
  table: MRT_TableInstance<TagTableRow>;
  selectedTags: TagRead[];
}

interface TagTableProps {
  projectId: number;
  // selection
  enableMultiRowSelection?: boolean;
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<TagTableRow>["onRowSelectionChange"];
  // toolbar
  renderTopRightToolbar?: (props: TagTableActionProps) => React.ReactNode;
  renderTopLeftToolbar?: (props: TagTableActionProps) => React.ReactNode;
  renderBottomToolbar?: (props: TagTableActionProps) => React.ReactNode;
}

export const TagTable = memo(
  ({
    enableMultiRowSelection = true,
    rowSelectionModel,
    onRowSelectionChange,
    renderTopRightToolbar,
    renderTopLeftToolbar,
    renderBottomToolbar,
  }: TagTableProps) => {
    // global server state
    const projectTags = TagHooks.useGetAllTags();

    // computed
    const { projectTagsMap, projectTagRows } = useMemo(() => {
      // we have to transform the data, better do this elsewhere?
      if (!projectTags.data) return { projectTagsMap: {}, projectTagRows: [] };

      const projectTagsMap = projectTags.data.reduce(
        (acc, projectTag) => {
          acc[projectTag.id.toString()] = projectTag;
          return acc;
        },
        {} as Record<string, TagRead>,
      );

      const projectTagRows = createDataTree(projectTags.data);

      return { projectTagsMap, projectTagRows };
    }, [projectTags.data]);

    // rendering
    const renderTopLeftToolbarContent = useMemo(
      () =>
        renderTopLeftToolbar
          ? (props: { table: MRT_TableInstance<TagTableRow> }) =>
              renderTopLeftToolbar({
                table: props.table,
                selectedTags: Object.keys(rowSelectionModel).map((tagId) => projectTagsMap[tagId]),
              })
          : undefined,
      [projectTagsMap, rowSelectionModel, renderTopLeftToolbar],
    );
    const renderBottomToolbarContent = useMemo(
      () =>
        renderBottomToolbar
          ? (props: { table: MRT_TableInstance<TagTableRow> }) =>
              renderBottomToolbar({
                table: props.table,
                selectedTags: Object.keys(rowSelectionModel).map((tagId) => projectTagsMap[tagId]),
              })
          : undefined,
      [projectTagsMap, rowSelectionModel, renderBottomToolbar],
    );
    const renderTopRightToolbarContent = useMemo(
      () =>
        renderTopRightToolbar
          ? (props: { table: MRT_TableInstance<TagTableRow> }) =>
              renderTopRightToolbar({
                table: props.table,
                selectedTags: Object.keys(rowSelectionModel).map((tagId) => projectTagsMap[tagId]),
              })
          : undefined,
      [projectTagsMap, rowSelectionModel, renderTopRightToolbar],
    );

    // table
    const table = useMaterialReactTable<TagTableRow>({
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
        rowSelection: rowSelectionModel,
        isLoading: projectTags.isLoading,
        showAlertBanner: projectTags.isError,
        showProgressBars: projectTags.isFetching,
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
      // selection
      enableRowSelection: true,
      enableMultiRowSelection,
      onRowSelectionChange,
      // toolbar
      enableBottomToolbar: !!renderBottomToolbar,
      renderTopToolbarCustomActions: renderTopLeftToolbarContent,
      renderToolbarInternalActions: renderTopRightToolbarContent,
      renderBottomToolbarCustomActions: renderBottomToolbarContent,
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
      // mui columns
      displayColumnDefOptions: {
        "mrt-row-expand": {
          enableResizing: false, //allow resizing
          grow: 0,
        },
      },
    });

    return <MaterialReactTable table={table} />;
  },
);
