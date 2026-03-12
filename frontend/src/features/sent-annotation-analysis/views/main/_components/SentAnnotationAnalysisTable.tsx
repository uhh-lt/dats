import { SentenceAnnotationTable } from "@core/sentence-annotation";
import { useReduxConnector } from "@store/storeHooks";
import { SentAnnotationsActions } from "../../../store/sentAnnotationAnalysisSlice";
import { SentAnnotationAnalysisTableToolbarLeft } from "./SentAnnotationAnalysisTableToolbarLeft";
import { SentAnnotationAnalysisTableToolbarRight } from "./SentAnnotationAnalysisTableToolbarRight";

const filterName = "sentAnnotationAnalysisTable";

interface SentAnnotationAnalysisTableProps {
  projectId: number;
}

export function SentAnnotationAnalysisTable({ projectId }: SentAnnotationAnalysisTableProps) {
  // global client state (redux) connected to table state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.sentAnnotationAnalysis.rowSelectionModel,
    SentAnnotationsActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.sentAnnotationAnalysis.sortingModel,
    SentAnnotationsActions.onSortChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.sentAnnotationAnalysis.columnVisibilityModel,
    SentAnnotationsActions.onColumnVisibilityChange,
  );
  const [fetchSize, setFetchSize] = useReduxConnector(
    (state) => state.sentAnnotationAnalysis.fetchSize,
    SentAnnotationsActions.onFetchSizeChange,
  );

  return (
    <SentenceAnnotationTable
      projectId={projectId}
      filterName={filterName}
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
