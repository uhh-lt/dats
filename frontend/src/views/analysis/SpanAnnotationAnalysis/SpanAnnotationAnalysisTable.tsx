import { useParams } from "react-router-dom";
import SpanAnnotationTable, {
  SpanAnnotationTableProps,
} from "../../../components/SpanAnnotation/SpanAnnotationTable/SpanAnnotationTable.tsx";
import { useReduxConnector } from "../../../utils/useReduxConnector.ts";
import BulkChangeSpanAnnotationCodeButton from "./BulkChangeSpanAnnotationCodeButton.tsx";
import { SpanAnnotationsActions } from "./spanAnnotationAnalysisSlice.ts";
import SpanAnnotationAnalysisTableToolbar from "./SpanAnnotationAnalysisTableToolbar.tsx";

const filterName = "spanAnnotationAnalysisTable";
interface SpanAnnotationAnalysisTableProps {
  cardProps: SpanAnnotationTableProps["cardProps"];
}

function SpanAnnotationAnalysisTable({ cardProps }: SpanAnnotationAnalysisTableProps) {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux) connected to table state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.spanAnnotationAnalysis.rowSelectionModel,
    SpanAnnotationsActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.spanAnnotationAnalysis.sortingModel,
    SpanAnnotationsActions.onSortChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.spanAnnotationAnalysis.columnVisibilityModel,
    SpanAnnotationsActions.onColumnVisibilityChange,
  );

  return (
    <SpanAnnotationTable
      projectId={projectId}
      filterName={filterName}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityChange={setColumnVisibilityModel}
      renderTopToolbarCustomActions={(props) => (
        <BulkChangeSpanAnnotationCodeButton {...props} filterName={filterName} />
      )}
      renderToolbarInternalActions={SpanAnnotationAnalysisTableToolbar}
      cardProps={cardProps}
      positionToolbarAlertBanner="head-overlay"
    />
  );
}

export default SpanAnnotationAnalysisTable;
