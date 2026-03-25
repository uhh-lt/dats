import { SpanColumns } from "@api/models/SpanColumns";
import {
  deserializeFilterFromSearchParam,
  FILTER_EXPERT_MODE_PARAM,
  FILTER_PARAM,
  MyFilter,
  serializeFilterToSearchParam,
} from "@core/filter";
import { SpanAnnotationLocalFilterTable } from "@core/span-annotation";
import { useURLConnector } from "@hooks/useURLConnector";
import { useReduxConnector } from "@store/storeHooks";
import { useCallback, useMemo } from "react";
import { SpanAnnotationsActions } from "../../../store/spanAnnotationAnalysisSlice";
import { SpanAnnotationAnalysisRouteAPI } from "../_hooks/spanAnnotationAnalysisRouteAPI";
import { SpanAnnotationAnalysisTableToolbarLeft } from "./SpanAnnotationAnalysisTableToolbarLeft";
import { SpanAnnotationAnalysisTableToolbarRight } from "./SpanAnnotationAnalysisTableToolbarRight";

const filterName = "spanAnnotationAnalysisFilter";

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
  const [expertMode, setExpertMode] = useURLConnector(SpanAnnotationAnalysisRouteAPI, FILTER_EXPERT_MODE_PARAM);
  const [serializedFilter, setSerializedFilter] = useURLConnector(SpanAnnotationAnalysisRouteAPI, FILTER_PARAM);
  const filter = useMemo(
    () => deserializeFilterFromSearchParam(serializedFilter, filterName) as MyFilter<SpanColumns>,
    [serializedFilter],
  );
  const setFilter = useCallback(
    (nextFilter: MyFilter) => {
      setSerializedFilter(serializeFilterToSearchParam(nextFilter));
      // reset state that depend on search parameters
      setRowSelectionModel({});
      setFetchSize(20);
    },
    [setFetchSize, setRowSelectionModel, setSerializedFilter],
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
