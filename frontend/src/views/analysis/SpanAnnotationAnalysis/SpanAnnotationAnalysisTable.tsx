import { useParams } from "react-router-dom";
import SpanAnnotationTable from "../../../components/SpanAnnotation/SpanAnnotationTable/SpanAnnotationTable.tsx";
import { useReduxConnector } from "../../../utils/useReduxConnector.ts";
import { SpanAnnotationsActions } from "./spanAnnotationAnalysisSlice.ts";
import SpanAnnotationAnalysisTableToolbarLeft from "./Toolbars/SpanAnnotationAnalysisTableToolbarLeft.tsx";
import SpanAnnotationAnalysisTableToolbarRight from "./Toolbars/SpanAnnotationAnalysisTableToolbarRight.tsx";

const filterName = "spanAnnotationAnalysisTable";

function SpanAnnotationAnalysisTable() {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux) connected to table state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.spanAnnotationAnalysis.rowSelectionModel,
    SpanAnnotationsActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.spanAnnotationAnalysis.sortingModel,
    SpanAnnotationsActions.onSortChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.spanAnnotationAnalysis.columnVisibilityModel,
    SpanAnnotationsActions.onColumnVisibilityChange,
  );

  return (
    <SpanAnnotationTable
      projectId={projectId}
      filterName={filterName}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityChange={setColumnVisibilityModel}
      renderTopLeftToolbar={SpanAnnotationAnalysisTableToolbarLeft}
      renderTopRightToolbar={SpanAnnotationAnalysisTableToolbarRight}
      positionToolbarAlertBanner="head-overlay"
    />
  );
}

export default SpanAnnotationAnalysisTable;
