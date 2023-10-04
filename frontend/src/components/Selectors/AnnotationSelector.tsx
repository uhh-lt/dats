import {
  DataGrid,
  GridCallbackDetails,
  GridColDef,
  GridRowSelectionModel,
  GridValueGetterParams,
} from "@mui/x-data-grid";
import * as React from "react";
import { useState } from "react";
import AnalysisHooks from "../../api/AnalysisHooks";
import { AnnotationOccurrence, CodeRead } from "../../api/openapi";
import CodeRenderer from "../DataGrid/CodeRenderer";
import { renderTextCellExpand } from "../DataGrid/renderTextCellExpand";
import CodeSelector from "./CodeSelector";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", valueGetter: (params: GridValueGetterParams) => params.row.annotation.id },
  {
    field: "sdoc",
    headerName: "Document",
    flex: 1,
    valueGetter: (params: GridValueGetterParams) => params.row.sdoc.filename,
    renderCell: (params) => <>{params.row.sdoc.filename}</>,
  },
  {
    field: "code",
    headerName: "Code",
    flex: 1,
    valueGetter: (params: GridValueGetterParams) => params.row.code.name,
    renderCell: (params) => <CodeRenderer code={params.row.code} />,
  },
  {
    field: "text",
    headerName: "Text",
    flex: 4,
    description: "The text of the annotation",
    renderCell: renderTextCellExpand,
  },
];

interface AnnotationSelectorProps {
  projectId: number;
  userIds: number[];
  setSelectedAnnotations: (annotations: AnnotationOccurrence[]) => void;
}

function AnnotationSelector({ projectId, userIds, setSelectedAnnotations }: AnnotationSelectorProps) {
  // local state
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);

  // code selection
  const [selectedCode, setSelectedCode] = useState<CodeRead>();
  const handleCodeSelection = (codes: CodeRead[]) => {
    codes.length > 0 ? setSelectedCode(codes[0]) : setSelectedCode(undefined);
  };

  // global server state
  const annotationOccurrences = AnalysisHooks.useAnnotationOccurrences(projectId, userIds, selectedCode?.id);
  const data = React.useMemo(() => {
    // we have to transform the data, better do this elsewhere?
    if (!annotationOccurrences.data) return [];

    return annotationOccurrences.data.map((row, index) => {
      return {
        ...row,
        id: index,
      };
    });
  }, [annotationOccurrences.data]);

  // events
  const onSelectionChange = (selectionModel: GridRowSelectionModel, details: GridCallbackDetails<any>) => {
    setSelectionModel(selectionModel);
    setSelectedAnnotations(selectionModel.map((id) => data[id as number]));
  };

  return (
    <>
      <CodeSelector
        projectId={projectId}
        setSelectedCodes={handleCodeSelection}
        allowMultiselect={false}
        height="400px"
      />
      <div style={{ height: 400, width: "100%" }}>
        <DataGrid
          rows={data}
          columns={columns}
          autoPageSize
          getRowId={(row) => row.id}
          checkboxSelection
          onRowSelectionModelChange={onSelectionChange}
          rowSelectionModel={selectionModel}
        />
      </div>
    </>
  );
}
export default AnnotationSelector;
