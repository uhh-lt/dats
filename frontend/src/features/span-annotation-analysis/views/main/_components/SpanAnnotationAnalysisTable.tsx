import { SpanColumns } from "@api/models/SpanColumns";
import { FILTER_EXPERT_MODE_PARAM, FILTER_PARAM, useFilterURLConnector } from "@core/filter";
import { SpanAnnotationLocalFilterTable } from "@core/span-annotation";
import { useURLConnector } from "@hooks/useURLConnector";
import { useReduxConnector } from "@store/storeHooks";
import { SpanAnnotationsActions } from "../../../store/spanAnnotationAnalysisSlice";
import { SpanAnnotationAnalysisRouteAPI } from "../_hooks/spanAnnotationAnalysisRouteAPI";
import { SpanAnnotationAnalysisTableToolbarLeft } from "./SpanAnnotationAnalysisTableToolbarLeft";
import { SpanAnnotationAnalysisTableToolbarRight } from "./SpanAnnotationAnalysisTableToolbarRight";

const filterName = "spanAnnotationAnalysisFilter";

interface SpanAnnotationAnalysisProps {
  projectId: number;
}

export function SpanAnnotationAnalysisTable({ projectId }: SpanAnnotationAnalysisProps) {
  // redux state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.spanAnnotationAnalysis.rowSelectionModel,
    SpanAnnotationsActions.onRowSelectionChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.spanAnnotationAnalysis.columnVisibilityModel,
    SpanAnnotationsActions.onColumnVisibilityChange,
  );

  // url state
  const [sortingModel, setSortingModel] = useURLConnector(SpanAnnotationAnalysisRouteAPI, "sortingModel");
  const [fetchSize, setFetchSize] = useURLConnector(SpanAnnotationAnalysisRouteAPI, "fetchSize");
  const [expertMode, setExpertMode] = useURLConnector(SpanAnnotationAnalysisRouteAPI, FILTER_EXPERT_MODE_PARAM);
  const [filter, setFilter] = useFilterURLConnector(
    SpanAnnotationAnalysisRouteAPI,
    filterName,
    FILTER_PARAM,
    SpanColumns,
  );

  return (
    <SpanAnnotationLocalFilterTable
      projectId={projectId}
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
      filterName={filterName}
      positionToolbarAlertBanner="head-overlay"
      filter={filter}
      expertMode={expertMode}
      onFilterChange={setFilter}
      onExpertModeChange={setExpertMode}
    />
  );
}
