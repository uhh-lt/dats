import { MRT_ColumnDef, MRT_RowSelectionState, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { useMemo, useState } from "react";
import AnalysisHooks from "../../api/AnalysisHooks.ts";
import { AnnotationOccurrence } from "../../api/openapi/models/AnnotationOccurrence.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import CodeRenderer from "../DataGrid/CodeRenderer.tsx";
import CodeSelector from "./CodeSelector.tsx";

const columns: MRT_ColumnDef<AnnotationOccurrence>[] = [
  { accessorKey: "id", header: "ID", accessorFn: (params) => params.annotation.id },
  {
    header: "Document",
    // flex: 1,
    id: "document",
    accessorFn: (params) => params.sdoc.filename,
    Cell: ({ row }) => <>{row.original.sdoc.filename}</>,
  },
  {
    header: "Code",
    // flex: 1,
    id: "code",
    accessorFn: (params) => params.code.name,
    Cell: ({ row }) => <CodeRenderer code={row.original.code} />,
  },
  {
    accessorKey: "text",
    header: "Text",
    // flex: 4,
    // description: "The text of the annotation",
    // renderCell: renderTextCellExpand,
  },
];

interface AnnotationSelectorProps {
  projectId: number;
  userIds: number[];
  setSelectedAnnotations: (annotations: AnnotationOccurrence[]) => void;
}

function AnnotationSelector({ projectId, userIds, setSelectedAnnotations }: AnnotationSelectorProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // code selection
  const [selectedCode, setSelectedCode] = useState<CodeRead>();
  const handleCodeSelection = (codes: CodeRead[]) => {
    codes.length > 0 ? setSelectedCode(codes[0]) : setSelectedCode(undefined);
  };

  // global server state
  const annotationOccurrences = AnalysisHooks.useAnnotationOccurrences(projectId, userIds, selectedCode?.id);

  // computed
  const annotationOccurrencesMap = useMemo(() => {
    // we have to transform the data, better do this elsewhere?
    if (!annotationOccurrences.data) return {};

    return annotationOccurrences.data.reduce(
      (acc, annotationOccurrence) => {
        acc[annotationOccurrence.annotation.id.toString()] = annotationOccurrence;
        return acc;
      },
      {} as Record<string, AnnotationOccurrence>,
    );
  }, [annotationOccurrences.data]);

  // table
  const table = useMaterialReactTable({
    data: annotationOccurrences.data || [],
    columns: columns,
    // autoPageSize
    // sx={{ border: "none" }}
    getRowId: (row) => row.annotation.id.toString(),
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
      setSelectedAnnotations(
        Object.entries(newRowSelectionModel)
          .filter(([, selected]) => selected)
          .map(([annotationId]) => annotationOccurrencesMap[annotationId]),
      );
    },
  });

  return (
    <>
      <CodeSelector
        projectId={projectId}
        setSelectedCodes={handleCodeSelection}
        allowMultiselect={false}
        height="400px"
      />
      <div style={{ height: 400, width: "100%" }}>
        <MaterialReactTable table={table} />
      </div>
    </>
  );
}
export default AnnotationSelector;
