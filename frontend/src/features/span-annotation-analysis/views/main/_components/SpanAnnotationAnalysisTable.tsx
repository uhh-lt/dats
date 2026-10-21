import { FILTER_EXPERT_MODE_PARAM, FILTER_PARAM, TableInfoHooks } from "@core/filter";
import { SpanColumns } from "@models/SpanColumns";
import { SpanAnnotationLocalFilterTable, spanAnnotationQueries } from "@core/span-annotation";
import { useURLConnector } from "@hooks/useURLConnector";
import { useReduxConnector } from "@store/storeHooks";
import { SpanAnnotationAnalysisActions } from "../../../store/spanAnnotationAnalysisSlice";
import { SpanAnnotationAnalysisRouteAPI } from "../_hooks/spanAnnotationAnalysisRouteAPI";
import { SpanAnnotationAnalysisTableToolbarLeft } from "./SpanAnnotationAnalysisTableToolbarLeft";
import { SpanAnnotationAnalysisTableToolbarRight } from "./SpanAnnotationAnalysisTableToolbarRight";

// besides the metadata columns
const HIDDEN_BY_DEFAULT: string[] = [SpanColumns.SP_MEMO_CONTENT];

const filterName = "spanAnnotationAnalysisFilter";

interface SpanAnnotationAnalysisProps {
  projectId: number;
}

export function SpanAnnotationAnalysisTable({ projectId }: SpanAnnotationAnalysisProps) {
  // redux state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.spanAnnotationAnalysis.rowSelectionModel,
    SpanAnnotationAnalysisActions.onRowSelectionChange,
  );
  const [storedColumnVisibility, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.spanAnnotationAnalysis.columnVisibilityModel,
    SpanAnnotationAnalysisActions.onColumnVisibilityChange,
  );

  const columnVisibilityModel = TableInfoHooks.useColumnVisibility(
    spanAnnotationQueries.tableInfo(projectId),
    storedColumnVisibility,
    HIDDEN_BY_DEFAULT,
  );

  // url state
  const [sortingModel, setSortingModel] = useURLConnector(SpanAnnotationAnalysisRouteAPI, "sortingModel");
  const [fetchSize, setFetchSize] = useURLConnector(SpanAnnotationAnalysisRouteAPI, "fetchSize");
  const [expertMode, setExpertMode] = useURLConnector(SpanAnnotationAnalysisRouteAPI, FILTER_EXPERT_MODE_PARAM);
  const [filter, setFilter] = useURLConnector(SpanAnnotationAnalysisRouteAPI, FILTER_PARAM);

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
