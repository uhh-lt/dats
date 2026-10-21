import { BBoxAnnotationLocalFilterTable, bboxAnnotationQueries } from "@core/bbox-annotation";
import { FILTER_EXPERT_MODE_PARAM, FILTER_PARAM, TableInfoHooks } from "@core/filter";
import { BBoxColumns } from "@models/BBoxColumns";
import { useURLConnector } from "@hooks/useURLConnector";
import { useReduxConnector } from "@store/storeHooks";
import { BBoxAnnotationAnalysisActions } from "../../../store/bboxAnnotationAnalysisSlice";
import { BBoxAnnotationAnalysisRouteAPI } from "../_hooks/bboxAnnotationAnalysisRouteAPI";
import { BBoxAnnotationAnalysisTableToolbarLeft } from "./toolbar/BBoxAnnotationAnalysisTableToolbarLeft";
import { BBoxAnnotationAnalysisTableToolbarRight } from "./toolbar/BBoxAnnotationAnalysisTableToolbarRight";

// besides the metadata columns
const HIDDEN_BY_DEFAULT: string[] = [BBoxColumns.BB_MEMO_CONTENT];

interface BBoxAnnotationAnalysisTableProps {
  projectId: number;
}

export function BBoxAnnotationAnalysisTable({ projectId }: BBoxAnnotationAnalysisTableProps) {
  // redux state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.bboxAnnotationAnalysis.rowSelectionModel,
    BBoxAnnotationAnalysisActions.onRowSelectionChange,
  );
  const [storedColumnVisibility, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.bboxAnnotationAnalysis.columnVisibilityModel,
    BBoxAnnotationAnalysisActions.onColumnVisibilityChange,
  );

  const columnVisibilityModel = TableInfoHooks.useColumnVisibility(
    bboxAnnotationQueries.tableInfo(projectId),
    storedColumnVisibility,
    HIDDEN_BY_DEFAULT,
  );

  // url state
  const [sortingModel, setSortingModel] = useURLConnector(BBoxAnnotationAnalysisRouteAPI, "sortingModel");
  const [fetchSize, setFetchSize] = useURLConnector(BBoxAnnotationAnalysisRouteAPI, "fetchSize");
  const [expertMode, setExpertMode] = useURLConnector(BBoxAnnotationAnalysisRouteAPI, FILTER_EXPERT_MODE_PARAM);
  const [filter, setFilter] = useURLConnector(BBoxAnnotationAnalysisRouteAPI, FILTER_PARAM);

  return (
    <BBoxAnnotationLocalFilterTable
      projectId={projectId}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityChange={setColumnVisibilityModel}
      renderTopLeftToolbar={BBoxAnnotationAnalysisTableToolbarLeft}
      renderTopRightToolbar={BBoxAnnotationAnalysisTableToolbarRight}
      fetchSize={fetchSize}
      onFetchSizeChange={setFetchSize}
      filterName={"root"}
      positionToolbarAlertBanner="head-overlay"
      filter={filter}
      expertMode={expertMode}
      onFilterChange={setFilter}
      onExpertModeChange={setExpertMode}
    />
  );
}
