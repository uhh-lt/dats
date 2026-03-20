import { SpanAnnotationURLFilterTable } from "@core/span-annotation";
import { useURLConnector } from "@hooks/useURLConnector";
import { useReduxConnector } from "@store/storeHooks";
import { SpanAnnotationsActions } from "../../../store/spanAnnotationAnalysisSlice";
import { SpanAnnotationAnalysisRouteAPI } from "../_hooks/spanAnnotationAnalysisRouteAPI";
import { SpanAnnotationAnalysisTableToolbarLeft } from "./SpanAnnotationAnalysisTableToolbarLeft";
import { SpanAnnotationAnalysisTableToolbarRight } from "./SpanAnnotationAnalysisTableToolbarRight";

interface SpanAnnotationAnalysisProps {
  projectId: number;
}

export function SpanAnnotationAnalysisTable({ projectId }: SpanAnnotationAnalysisProps) {
  // global client state (redux) connected to table state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.spanAnnotationAnalysis.rowSelectionModel,
    SpanAnnotationsActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useURLConnector(SpanAnnotationAnalysisRouteAPI, "sortingModel");
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.spanAnnotationAnalysis.columnVisibilityModel,
    SpanAnnotationsActions.onColumnVisibilityChange,
  );
  const [fetchSize, setFetchSize] = useURLConnector(SpanAnnotationAnalysisRouteAPI, "fetchSize");

  return (
    <SpanAnnotationURLFilterTable
      projectId={projectId}
      routeApi={SpanAnnotationAnalysisRouteAPI}
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
