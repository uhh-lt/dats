import { CircularProgress } from "@mui/material";
import { DataGrid, GridCallbackDetails, GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import { useState } from "react";
import ProjectHooks from "../../api/ProjectHooks";
import { DocumentTagRead } from "../../api/openapi";
import LabelIcon from "@mui/icons-material/Label";
import { renderTextCellExpand } from "../DataGrid/renderTextCellExpand";

const columns: GridColDef[] = [
  {
    field: "color",
    headerName: "Color",
    flex: 0,
    renderCell: (params) => {
      return <LabelIcon style={{ color: params.value, blockSize: 24 }} />;
    },
  },
  {
    field: "title",
    headerName: "Title",
    flex: 1,
  },
  {
    field: "description",
    headerName: "Description",
    flex: 2,
    renderCell: renderTextCellExpand,
  },
];

interface TagSelectorProps {
  projectId: number;
  setSelectedTags: (tags: DocumentTagRead[]) => void;
}

function TagSelector({ projectId, setSelectedTags }: TagSelectorProps) {
  // local state
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);

  // global server state
  const projectTags = ProjectHooks.useGetAllTags(projectId);

  // events
  const onSelectionChange = (selectionModel: GridRowSelectionModel, details: GridCallbackDetails<any>) => {
    if (!projectTags.data) return;
    setSelectionModel(selectionModel);
    // todo: this is probably very inefficient
    setSelectedTags(projectTags.data.filter((tag) => selectionModel.indexOf(tag.id) !== -1));
  };

  return (
    <div style={{ height: 400, width: "100%" }}>
      {projectTags.isLoading && <CircularProgress />}
      {projectTags.isError && <div>Error</div>}
      {projectTags.isSuccess && (
        <DataGrid
          rows={projectTags.data}
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
export default TagSelector;
