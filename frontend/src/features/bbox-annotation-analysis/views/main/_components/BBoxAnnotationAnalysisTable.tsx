import { BBoxAnnotationURLFilterTable } from "@core/bbox-annotation";
import { useURLConnector } from "@hooks/useURLConnector";
import { useReduxConnector } from "@store/storeHooks";
import { BBoxAnnotationsActions } from "../../../store/bboxAnnotationAnalysisSlice";
import { BBoxAnnotationAnalysisRouteAPI } from "../_hooks/bboxAnnotationAnalysisRouteAPI";
import { BBoxAnnotationAnalysisTableToolbarLeft } from "./toolbar/BBoxAnnotationAnalysisTableToolbarLeft";
import { BBoxAnnotationAnalysisTableToolbarRight } from "./toolbar/BBoxAnnotationAnalysisTableToolbarRight";

interface BBoxAnnotationAnalysisTableProps {
  projectId: number;
}

export function BBoxAnnotationAnalysisTable({ projectId }: BBoxAnnotationAnalysisTableProps) {
  // global client state (redux) connected to table state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.bboxAnnotationAnalysis.rowSelectionModel,
    BBoxAnnotationsActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useURLConnector(BBoxAnnotationAnalysisRouteAPI, "sortingModel");
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.bboxAnnotationAnalysis.columnVisibilityModel,
    BBoxAnnotationsActions.onColumnVisibilityChange,
  );
  const [fetchSize, setFetchSize] = useURLConnector(BBoxAnnotationAnalysisRouteAPI, "fetchSize");

  return (
    <BBoxAnnotationURLFilterTable
      projectId={projectId}
      routeApi={BBoxAnnotationAnalysisRouteAPI}
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
      positionToolbarAlertBanner="head-overlay"
    />
  );
}
