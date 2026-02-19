import SpanAnnotationTable from "../../../components/SpanAnnotation/SpanAnnotationTable/SpanAnnotationTable.tsx";
import { useReduxConnector } from "../../../utils/useReduxConnector.ts";
import { SpanAnnotationsActions } from "./spanAnnotationAnalysisSlice.ts";
import SpanAnnotationAnalysisTableToolbarLeft from "./Toolbars/SpanAnnotationAnalysisTableToolbarLeft.tsx";
import SpanAnnotationAnalysisTableToolbarRight from "./Toolbars/SpanAnnotationAnalysisTableToolbarRight.tsx";

const filterName = "spanAnnotationAnalysisTable";

interface SpanAnnotationAnalysisProps {
  projectId: number;
}

function SpanAnnotationAnalysisTable({ projectId }: SpanAnnotationAnalysisProps) {
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
  const [fetchSize, setFetchSize] = useReduxConnector(
    (state) => state.spanAnnotationAnalysis.fetchSize,
    SpanAnnotationsActions.onFetchSizeChange,
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
      fetchSize={fetchSize}
      onFetchSizeChange={setFetchSize}
      positionToolbarAlertBanner="head-overlay"
    />
  );
}

export default SpanAnnotationAnalysisTable;
