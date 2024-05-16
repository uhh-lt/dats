import { useParams } from "react-router-dom";
import SpanAnnotationTable, {
  SpanAnnotationTableProps,
} from "../../../components/SpanAnnotationTable/SpanAnnotationTable.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotatedSegmentsTableToolbar from "./AnnotatedSegmentsTableToolbar.tsx";
import BulkChangeCodeButton from "./BulkChangeCodeButton.tsx";
import { AnnotatedSegmentsActions } from "./annotatedSegmentsSlice.ts";

const filterName = "annotatedSegments";
interface AnnotatedSegmentsTableProps {
  cardProps: SpanAnnotationTableProps["cardProps"];
  onRowContextMenu: SpanAnnotationTableProps["onRowContextMenu"];
}

function AnnotatedSegmentsTable({ onRowContextMenu, cardProps }: AnnotatedSegmentsTableProps) {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux)
  const rowSelectionModel = useAppSelector((state) => state.annotatedSegments.rowSelectionModel);
  const sortingModel = useAppSelector((state) => state.annotatedSegments.sortModel);
  const columnVisibilityModel = useAppSelector((state) => state.annotatedSegments.columnVisibilityModel);
  const dispatch = useAppDispatch();

  return (
    <SpanAnnotationTable
      projectId={projectId}
      filterName={filterName}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={(newRowSelectionModel) =>
        dispatch(AnnotatedSegmentsActions.onSelectionModelChange(newRowSelectionModel))
      }
      sortingModel={sortingModel}
      onSortingChange={(newSortingModel) => dispatch(AnnotatedSegmentsActions.onSortModelChange(newSortingModel))}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityChange={(newColumnVisibilityModel) =>
        dispatch(AnnotatedSegmentsActions.onColumnVisibilityChange(newColumnVisibilityModel))
      }
      onRowContextMenu={onRowContextMenu}
      renderTopToolbarCustomActions={(props) => <BulkChangeCodeButton {...props} filterName={filterName} />}
      renderToolbarInternalActions={AnnotatedSegmentsTableToolbar}
      cardProps={cardProps}
      positionToolbarAlertBanner="head-overlay"
    />
  );
}

export default AnnotatedSegmentsTable;
