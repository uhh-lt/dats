import { Button, CircularProgress, Tooltip } from "@mui/material";
import { MRT_ColumnDef, MRT_RowSelectionState, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { useMemo, useState } from "react";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { SourceDocumentRead } from "../../api/openapi/models/SourceDocumentRead.ts";
import { docTypeToIcon } from "../../features/DocumentExplorer/docTypeToIcon.tsx";

const columns: MRT_ColumnDef<SourceDocumentRead>[] = [
  {
    accessorKey: "id",
    header: "ID",
    // flex: 0
  },
  {
    accessorKey: "doctype",
    header: "Doc type",
    // flex: 0,
    Cell: ({ row }) => <Tooltip title={row.original.doctype}>{docTypeToIcon[row.original.doctype]}</Tooltip>,
  },
  {
    accessorKey: "filename",
    header: "File name",
    // flex: 1,
  },
];

interface DocumentSelectorProps {
  projectId: number;
  setSelectedDocuments: (documents: SourceDocumentRead[]) => void;
}

function DocumentSelector({ projectId, setSelectedDocuments }: DocumentSelectorProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global server state
  const projectDocuments = ProjectHooks.useGetProjectDocumentsInfinite(projectId, false);
  const { allProjectDocuments, allProjectDocumentsMap, total } = useMemo(() => {
    if (!projectDocuments.data) return { allProjectDocuments: [], allProjectDocumentsMap: {}, total: 0 };
    const allProjectDocuments = projectDocuments.data.pages.map((page) => page.sdocs).flat();
    const allProjectDocumentsMap = allProjectDocuments.reduce(
      (acc, sdoc) => {
        acc[sdoc.id.toString()] = sdoc;
        return acc;
      },
      {} as Record<string, SourceDocumentRead>,
    );
    const total = projectDocuments.data.pages[projectDocuments.data.pages.length - 1].total;
    return { allProjectDocuments, allProjectDocumentsMap, total };
  }, [projectDocuments.data]);

  // table
  const table = useMaterialReactTable({
    data: allProjectDocuments,
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
      setSelectedDocuments(
        Object.entries(newRowSelectionModel)
          .filter(([, selected]) => selected)
          .map(([sdocId]) => allProjectDocumentsMap[sdocId]),
      );
    },
  });

  return (
    <div style={{ height: 400, width: "100%" }}>
      {projectDocuments.isLoading && <CircularProgress />}
      {projectDocuments.isError && <div>Error</div>}
      {projectDocuments.isSuccess && (
        <>
          <MaterialReactTable table={table} />
          Loaded {allProjectDocuments.length} / {total} documents.{" "}
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
