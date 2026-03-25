import { SpanColumns } from "@api/models/SpanColumns";
import { FILTER_EXPERT_MODE_PARAM, FILTER_PARAM, MyFilter, useFilterURLConnector } from "@core/filter";
import { SpanAnnotationLocalFilterTable } from "@core/span-annotation";
import { useURLConnector } from "@hooks/useURLConnector";
import { useReduxConnector } from "@store/storeHooks";
import { MRT_SortingState, MRT_Updater } from "material-react-table";
import { useCallback } from "react";
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

  // handler to reset state that depend on search parameters when filter change
  const onFilterChange = useCallback(
    (nextFilter: MyFilter<SpanColumns>) => {
      setFilter(nextFilter);
      // reset state that depend on search parameters
      setRowSelectionModel({});
      setFetchSize(20);
    },
    [setFetchSize, setFilter, setRowSelectionModel],
  );

  const onSortingChange = useCallback(
    (updaterOrValue: MRT_Updater<MRT_SortingState>) => {
      setSortingModel(updaterOrValue);
      // reset state that depend on search parameters
      setRowSelectionModel({});
    },
    [setSortingModel, setRowSelectionModel],
  );

  return (
    <SpanAnnotationLocalFilterTable
      projectId={projectId}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={onSortingChange}
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
      onFilterChange={onFilterChange}
      onExpertModeChange={setExpertMode}
    />
  );
}
