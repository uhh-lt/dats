import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_TableInstance,
  MRT_TableOptions,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { memo, useMemo } from "react";
import MetadataHooks from "../../api/MetadataHooks.ts";
import { ProjectMetadataRead } from "../../api/openapi/models/ProjectMetadataRead.ts";

const columns: MRT_ColumnDef<ProjectMetadataRead>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    grow: 0,
    accessorKey: "key",
    header: "Metadata",
  },
  {
    grow: 0,
    accessorKey: "metatype",
    header: "Type",
  },
  {
    grow: 1,
    accessorKey: "description",
    header: "Description",
  },
];

export interface ProjectMetadataTableActionProps {
  table: MRT_TableInstance<ProjectMetadataRead>;
  selectedProjectMetadata: ProjectMetadataRead[];
}

interface SharedProjectMetadataTableProps {
  // selection
  enableMultiRowSelection?: boolean;
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<ProjectMetadataRead>["onRowSelectionChange"];
  // toolbar
  renderTopRightToolbar?: (props: ProjectMetadataTableActionProps) => React.ReactNode;
  renderTopLeftToolbar?: (props: ProjectMetadataTableActionProps) => React.ReactNode;
  renderBottomToolbar?: (props: ProjectMetadataTableActionProps) => React.ReactNode;
}

interface ProjectMetadataTableProps extends SharedProjectMetadataTableProps {
  projectMetadata?: ProjectMetadataRead[];
}

function ProjectMetadataTable(props: ProjectMetadataTableProps) {
  const projectMetadata = props.projectMetadata;
  if (projectMetadata) {
    return <ProjectMetadataTableContent projectMetadata={projectMetadata} {...props} />;
  } else {
    return <ProjectMetadataTableWithoutMetadata {...props} />;
  }
}

function ProjectMetadataTableWithoutMetadata(props: SharedProjectMetadataTableProps) {
  // global server state
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();

  if (projectMetadata.isSuccess) {
    return <ProjectMetadataTableContent {...props} projectMetadata={projectMetadata.data} />;
  } else {
    return null;
  }
}

interface ProjectMetadataTableContentProps extends SharedProjectMetadataTableProps {
  projectMetadata: ProjectMetadataRead[];
}

function ProjectMetadataTableContent({
  projectMetadata,
  enableMultiRowSelection = true,
  rowSelectionModel,
  onRowSelectionChange,
  renderTopLeftToolbar,
  renderTopRightToolbar,
  renderBottomToolbar,
}: ProjectMetadataTableContentProps) {
  // computed
  const projectMetadataMap = useMemo(() => {
    const projectMetadataMap = projectMetadata.reduce(
      (acc, projectMetadata) => {
        acc[projectMetadata.id.toString()] = projectMetadata;
        return acc;
      },
      {} as Record<string, ProjectMetadataRead>,
    );

    return projectMetadataMap;
  }, [projectMetadata]);

  // rendering
  const renderTopRightToolbarContent = useMemo(
    () =>
      renderTopRightToolbar
        ? (props: { table: MRT_TableInstance<ProjectMetadataRead> }) =>
            renderTopRightToolbar({
              table: props.table,
              selectedProjectMetadata: Object.keys(rowSelectionModel).map((mId) => projectMetadataMap[mId]),
            })
        : undefined,
    [projectMetadataMap, renderTopRightToolbar, rowSelectionModel],
  );
  const renderTopLeftToolbarContent = useMemo(
    () =>
      renderTopLeftToolbar
        ? (props: { table: MRT_TableInstance<ProjectMetadataRead> }) =>
            renderTopLeftToolbar({
              table: props.table,
              selectedProjectMetadata: Object.keys(rowSelectionModel).map((mId) => projectMetadataMap[mId]),
            })
        : undefined,
    [projectMetadataMap, renderTopLeftToolbar, rowSelectionModel],
  );
  const renderBottomToolbarContent = useMemo(
    () =>
      renderBottomToolbar
        ? (props: { table: MRT_TableInstance<ProjectMetadataRead> }) =>
            renderBottomToolbar({
              table: props.table,
              selectedProjectMetadata: Object.keys(rowSelectionModel).map((mId) => projectMetadataMap[mId]),
            })
        : undefined,
    [projectMetadataMap, renderBottomToolbar, rowSelectionModel],
  );

  // table
  const table = useMaterialReactTable<ProjectMetadataRead>({
    data: projectMetadata,
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
    },
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
  });

  return <MaterialReactTable table={table} />;
}
export default memo(ProjectMetadataTable);
