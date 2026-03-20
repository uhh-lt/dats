import { SentenceAnnotationURLFilterTable } from "@core/sentence-annotation";
import { useURLConnector } from "@hooks/useURLConnector";
import { useReduxConnector } from "@store/storeHooks";
import { SentAnnotationsActions } from "../../../store/sentAnnotationAnalysisSlice";
import { SentAnnotationAnalysisRouteAPI } from "../_hooks/sentAnnotationAnalysisRouteAPI";
import { SentAnnotationAnalysisTableToolbarLeft } from "./SentAnnotationAnalysisTableToolbarLeft";
import { SentAnnotationAnalysisTableToolbarRight } from "./SentAnnotationAnalysisTableToolbarRight";

interface SentAnnotationAnalysisTableProps {
  projectId: number;
}

export function SentAnnotationAnalysisTable({ projectId }: SentAnnotationAnalysisTableProps) {
  // global client state (redux) connected to table state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.sentAnnotationAnalysis.rowSelectionModel,
    SentAnnotationsActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useURLConnector(SentAnnotationAnalysisRouteAPI, "sortingModel");
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.sentAnnotationAnalysis.columnVisibilityModel,
    SentAnnotationsActions.onColumnVisibilityChange,
  );
  const [fetchSize, setFetchSize] = useURLConnector(SentAnnotationAnalysisRouteAPI, "fetchSize");

  return (
    <SentenceAnnotationURLFilterTable
      projectId={projectId}
      routeApi={SentAnnotationAnalysisRouteAPI}
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
      positionToolbarAlertBanner="head-overlay"
    />
  );
}
