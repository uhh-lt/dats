import { SentAnnoColumns } from "@api/models/SentAnnoColumns";
import {
  deserializeFilterFromSearchParam,
  FILTER_EXPERT_MODE_PARAM,
  FILTER_PARAM,
  MyFilter,
  serializeFilterToSearchParam,
} from "@core/filter";
import { SentenceAnnotationLocalFilterTable } from "@core/sentence-annotation";
import { useURLConnector } from "@hooks/useURLConnector";
import { useReduxConnector } from "@store/storeHooks";
import { useCallback, useMemo } from "react";
import { SentAnnotationsActions } from "../../../store/sentAnnotationAnalysisSlice";
import { SentAnnotationAnalysisRouteAPI } from "../_hooks/sentAnnotationAnalysisRouteAPI";
import { SentAnnotationAnalysisTableToolbarLeft } from "./SentAnnotationAnalysisTableToolbarLeft";
import { SentAnnotationAnalysisTableToolbarRight } from "./SentAnnotationAnalysisTableToolbarRight";

const filterName = "sentAnnotationAnalysisFilter";

interface SentAnnotationAnalysisTableProps {
  projectId: number;
}

export function SentAnnotationAnalysisTable({ projectId }: SentAnnotationAnalysisTableProps) {
  // global client state (redux) connected to table state
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
  const [serializedFilter, setSerializedFilter] = useURLConnector(SentAnnotationAnalysisRouteAPI, FILTER_PARAM);
  const filter = useMemo(
    () => deserializeFilterFromSearchParam(serializedFilter, filterName) as MyFilter<SentAnnoColumns>,
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
    <SentenceAnnotationLocalFilterTable
      projectId={projectId}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
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
      onFilterChange={setFilter}
      onExpertModeChange={setExpertMode}
    />
  );
}
