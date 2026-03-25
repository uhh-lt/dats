import { BBoxColumns } from "@api/models/BBoxColumns";
import { BBoxAnnotationLocalFilterTable } from "@core/bbox-annotation";
import { FILTER_EXPERT_MODE_PARAM, FILTER_PARAM, MyFilter, useFilterURLConnector } from "@core/filter";
import { useURLConnector } from "@hooks/useURLConnector";
import { useReduxConnector } from "@store/storeHooks";
import { MRT_SortingState, MRT_Updater } from "material-react-table";
import { useCallback } from "react";
import { BBoxAnnotationsActions } from "../../../store/bboxAnnotationAnalysisSlice";
import { BBoxAnnotationAnalysisRouteAPI } from "../_hooks/bboxAnnotationAnalysisRouteAPI";
import { BBoxAnnotationAnalysisTableToolbarLeft } from "./toolbar/BBoxAnnotationAnalysisTableToolbarLeft";
import { BBoxAnnotationAnalysisTableToolbarRight } from "./toolbar/BBoxAnnotationAnalysisTableToolbarRight";

const filterName = "bboxAnnotationAnalysisFilter";

interface BBoxAnnotationAnalysisTableProps {
  projectId: number;
}

export function BBoxAnnotationAnalysisTable({ projectId }: BBoxAnnotationAnalysisTableProps) {
  // redux state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.bboxAnnotationAnalysis.rowSelectionModel,
    BBoxAnnotationsActions.onRowSelectionChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.bboxAnnotationAnalysis.columnVisibilityModel,
    BBoxAnnotationsActions.onColumnVisibilityChange,
  );

  // url state
  const [sortingModel, setSortingModel] = useURLConnector(BBoxAnnotationAnalysisRouteAPI, "sortingModel");
  const [fetchSize, setFetchSize] = useURLConnector(BBoxAnnotationAnalysisRouteAPI, "fetchSize");
  const [expertMode, setExpertMode] = useURLConnector(BBoxAnnotationAnalysisRouteAPI, FILTER_EXPERT_MODE_PARAM);
  const [filter, setFilter] = useFilterURLConnector(
    BBoxAnnotationAnalysisRouteAPI,
    filterName,
    FILTER_PARAM,
    BBoxColumns,
  );

  // handler to reset state that depend on search parameters when filter change
  const onFilterChange = useCallback(
    (nextFilter: MyFilter<BBoxColumns>) => {
      setFilter(nextFilter);
      // reset state that depend on search parameters
      setRowSelectionModel({});
      setFetchSize(20);
    },
    [setFilter, setFetchSize, setRowSelectionModel],
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
    <BBoxAnnotationLocalFilterTable
      projectId={projectId}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={onSortingChange}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityChange={setColumnVisibilityModel}
      renderTopLeftToolbar={BBoxAnnotationAnalysisTableToolbarLeft}
      renderTopRightToolbar={BBoxAnnotationAnalysisTableToolbarRight}
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
