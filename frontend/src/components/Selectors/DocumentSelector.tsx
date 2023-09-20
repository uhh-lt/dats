import { Button, CircularProgress, Tooltip } from "@mui/material";
import { DataGrid, GridCallbackDetails, GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import { DocType, SourceDocumentRead } from "../../api/openapi";
import ProjectHooks from "../../api/ProjectHooks";
import { docTypeToIcon } from "../../features/DocumentExplorer/docTypeToIcon";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", flex: 0 },
  {
    field: "doctype",
    headerName: "Doc type",
    flex: 0,
    renderCell: (params) => <Tooltip title={params.value}>{docTypeToIcon[params.value as DocType]}</Tooltip>,
  },
  {
    field: "filename",
    headerName: "File name",
    flex: 1,
  },
];

interface DocumentSelectorProps {
  projectId: number;
  setSelectedDocuments: (documents: SourceDocumentRead[]) => void;
}

function DocumentSelector({ projectId, setSelectedDocuments }: DocumentSelectorProps) {
  // local state
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);

  // global server state
  const projectDocuments = ProjectHooks.useGetProjectDocumentsInfinite(projectId, false);
  const { data, total } = useMemo(() => {
    if (!projectDocuments.data) return { data: [], total: 0 };
    const data = projectDocuments.data.pages.map((page) => page.sdocs).flat();
    const total = projectDocuments.data.pages[projectDocuments.data.pages.length - 1].total;
    return { data: data, total: total };
  }, [projectDocuments.data]);

  // events
  const onSelectionChange = (selectionModel: GridRowSelectionModel, details: GridCallbackDetails<any>) => {
    setSelectionModel(selectionModel);
    // todo: this is probably very inefficient
    setSelectedDocuments(data.filter((sdoc) => selectionModel.indexOf(sdoc.id) !== -1));
  };

  return (
    <div style={{ height: 400, width: "100%" }}>
      {projectDocuments.isLoading && <CircularProgress />}
      {projectDocuments.isError && <div>Error</div>}
      {projectDocuments.isSuccess && (
        <>
          <DataGrid
            rows={data}
            columns={columns}
            autoPageSize
            // sx={{ border: "none" }}
            getRowId={(row) => row.id}
            checkboxSelection
            rowSelectionModel={selectionModel}
            onRowSelectionModelChange={onSelectionChange}
          />
          Loaded {data.length} / {total} documents.{" "}
          <Button
            disabled={!projectDocuments.hasNextPage || projectDocuments.isFetchingNextPage}
            onClick={() => projectDocuments.fetchNextPage()}
          >
            Fetch more?
          </Button>
        </>
      )}
    </div>
  );
}
export default DocumentSelector;
