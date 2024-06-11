import { useParams } from "react-router-dom";
import SpanAnnotationTable, {
  SpanAnnotationTableProps,
} from "../../../components/SpanAnnotation/SpanAnnotationTable/SpanAnnotationTable.tsx";
import { useReduxConnector } from "../../../utils/useReduxConnector.ts";
import AnnotatedSegmentsTableToolbar from "./AnnotatedSegmentsTableToolbar.tsx";
import BulkChangeCodeButton from "./BulkChangeCodeButton.tsx";
import { AnnotatedSegmentsActions } from "./annotatedSegmentsSlice.ts";

const filterName = "annotatedSegments";
interface AnnotatedSegmentsTableProps {
  cardProps: SpanAnnotationTableProps["cardProps"];
}

function AnnotatedSegmentsTable({ cardProps }: AnnotatedSegmentsTableProps) {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux) connected to table state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.annotatedSegments.rowSelectionModel,
    AnnotatedSegmentsActions.onRowSelectionModelChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.annotatedSegments.sortingModel,
    AnnotatedSegmentsActions.onSortModelChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.annotatedSegments.columnVisibilityModel,
    AnnotatedSegmentsActions.onColumnVisibilityChange,
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
      renderTopToolbarCustomActions={(props) => <BulkChangeCodeButton {...props} filterName={filterName} />}
      renderToolbarInternalActions={AnnotatedSegmentsTableToolbar}
      cardProps={cardProps}
      positionToolbarAlertBanner="head-overlay"
    />
  );
}

export default AnnotatedSegmentsTable;
