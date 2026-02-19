import BBoxAnnotationTable from "../../../components/BBoxAnnotation/BBoxAnnotationTable/BBoxAnnotationTable.tsx";
import { useReduxConnector } from "../../../utils/useReduxConnector.ts";
import { BBoxAnnotationsActions } from "./bboxAnnotationAnalysisSlice.ts";
import BBoxAnnotationAnalysisTableToolbarLeft from "./Toolbars/BBoxAnnotationAnalysisTableToolbarLeft.tsx";
import BBoxAnnotationAnalysisTableToolbarRight from "./Toolbars/BBoxAnnotationAnalysisTableToolbarRight.tsx";

const filterName = "bboxAnnotationAnalysisTable";

interface BBoxAnnotationAnalysisTableProps {
  projectId: number;
}

function BBoxAnnotationAnalysisTable({ projectId }: BBoxAnnotationAnalysisTableProps) {
  // global client state (redux) connected to table state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.bboxAnnotationAnalysis.rowSelectionModel,
    BBoxAnnotationsActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.bboxAnnotationAnalysis.sortingModel,
    BBoxAnnotationsActions.onSortChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.bboxAnnotationAnalysis.columnVisibilityModel,
    BBoxAnnotationsActions.onColumnVisibilityChange,
  );
  const [fetchSize, setFetchSize] = useReduxConnector(
    (state) => state.bboxAnnotationAnalysis.fetchSize,
    BBoxAnnotationsActions.onFetchSizeChange,
  );

  return (
    <BBoxAnnotationTable
      projectId={projectId}
      filterName={filterName}
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

export default BBoxAnnotationAnalysisTable;
