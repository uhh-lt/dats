import SentenceAnnotationTable from "../../../components/SentenceAnnotation/SentenceAnnotationTable/SentenceAnnotationTable.tsx";
import { useReduxConnector } from "../../../utils/useReduxConnector.ts";
import { SentAnnotationsActions } from "./sentAnnotationAnalysisSlice.ts";
import SentAnnotationAnalysisTableToolbarLeft from "./Toolbars/SentAnnotationAnalysisTableToolbarLeft.tsx";
import SentAnnotationAnalysisTableToolbarRight from "./Toolbars/SentAnnotationAnalysisTableToolbarRight.tsx";

const filterName = "sentAnnotationAnalysisTable";

interface SentAnnotationAnalysisTableProps {
  projectId: number;
}

function SentAnnotationAnalysisTable({ projectId }: SentAnnotationAnalysisTableProps) {
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

export default SentAnnotationAnalysisTable;
