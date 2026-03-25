import { SentAnnoColumns } from "@api/models/SentAnnoColumns";
import { FILTER_EXPERT_MODE_PARAM, FILTER_PARAM, MyFilter, useFilterURLConnector } from "@core/filter";
import { SentenceAnnotationLocalFilterTable } from "@core/sentence-annotation";
import { useURLConnector } from "@hooks/useURLConnector";
import { useReduxConnector } from "@store/storeHooks";
import { MRT_SortingState, MRT_Updater } from "material-react-table";
import { useCallback } from "react";
import { SentAnnotationsActions } from "../../../store/sentAnnotationAnalysisSlice";
import { SentAnnotationAnalysisRouteAPI } from "../_hooks/sentAnnotationAnalysisRouteAPI";
import { SentAnnotationAnalysisTableToolbarLeft } from "./SentAnnotationAnalysisTableToolbarLeft";
import { SentAnnotationAnalysisTableToolbarRight } from "./SentAnnotationAnalysisTableToolbarRight";

const filterName = "sentAnnotationAnalysisFilter";

interface SentAnnotationAnalysisTableProps {
  projectId: number;
}

export function SentAnnotationAnalysisTable({ projectId }: SentAnnotationAnalysisTableProps) {
  // redux state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.sentAnnotationAnalysis.rowSelectionModel,
    SentAnnotationsActions.onRowSelectionChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.sentAnnotationAnalysis.columnVisibilityModel,
    SentAnnotationsActions.onColumnVisibilityChange,
  );

  // url state
  const [sortingModel, setSortingModel] = useURLConnector(SentAnnotationAnalysisRouteAPI, "sortingModel");
  const [fetchSize, setFetchSize] = useURLConnector(SentAnnotationAnalysisRouteAPI, "fetchSize");
  const [expertMode, setExpertMode] = useURLConnector(SentAnnotationAnalysisRouteAPI, FILTER_EXPERT_MODE_PARAM);
  const [filter, setFilter] = useFilterURLConnector(
    SentAnnotationAnalysisRouteAPI,
    filterName,
    FILTER_PARAM,
    SentAnnoColumns,
  );

  // handler to reset state that depend on search parameters when filter change
  const onFilterChange = useCallback(
    (nextFilter: MyFilter<SentAnnoColumns>) => {
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
    <SentenceAnnotationLocalFilterTable
      projectId={projectId}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={onSortingChange}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityChange={setColumnVisibilityModel}
      renderTopLeftToolbar={SentAnnotationAnalysisTableToolbarLeft}
      renderTopRightToolbar={SentAnnotationAnalysisTableToolbarRight}
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
