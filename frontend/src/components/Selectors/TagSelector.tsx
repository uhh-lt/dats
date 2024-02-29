import LabelIcon from "@mui/icons-material/Label";
import { CircularProgress } from "@mui/material";
import { MRT_ColumnDef, MRT_RowSelectionState, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { useMemo, useState } from "react";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";

const columns: MRT_ColumnDef<DocumentTagRead>[] = [
  {
    accessorKey: "color",
    header: "Color",
    // flex: 0,
    Cell: ({ row }) => {
      return <LabelIcon style={{ color: row.original.color, blockSize: 24 }} />;
    },
  },
  {
    accessorKey: "title",
    header: "Title",
    // flex: 1,
  },
  {
    accessorKey: "description",
    header: "Description",
    // flex: 2,
  },
];

interface TagSelectorProps {
  projectId: number;
  setSelectedTags: (tags: DocumentTagRead[]) => void;
}

function TagSelector({ projectId, setSelectedTags }: TagSelectorProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global server state
  const projectTags = ProjectHooks.useGetAllTags(projectId);

  // computed
  const projectTagsMap = useMemo(() => {
    // we have to transform the data, better do this elsewhere?
    if (!projectTags.data) return {};

    return projectTags.data.reduce(
      (acc, projectTag) => {
        acc[projectTag.id.toString()] = projectTag;
        return acc;
      },
      {} as Record<string, DocumentTagRead>,
    );
  }, [projectTags.data]);

  // table
  const table = useMaterialReactTable({
    data: projectTags.data || [],
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
      setSelectedTags(
        Object.entries(newRowSelectionModel)
          .filter(([, selected]) => selected)
          .map(([tagId]) => projectTagsMap[tagId]),
      );
    },
  });

  return (
    <div style={{ height: 400, width: "100%" }}>
      {projectTags.isLoading && <CircularProgress />}
      {projectTags.isError && <div>Error</div>}
      {projectTags.isSuccess && <MaterialReactTable table={table} />}
    </div>
  );
}
export default TagSelector;
