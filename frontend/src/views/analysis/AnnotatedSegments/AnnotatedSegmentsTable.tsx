import { Typography } from "@mui/material";
import SpanAnnotationTable from "../../../components/DataGridTables/SpanAnnotationTable";
import { useAnnotatedSegmentQuery } from "./useAnnotatedSegmentsQuery";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { AnnotatedSegmentsActions } from "./annotatedSegmentsSlice";

interface AnnotateSegmentsTableProps {
  onRowContextMenu: (event: React.MouseEvent<HTMLDivElement>, spanAnnotationId: number) => void;
}

function AnnotateSegmentsTable({ onRowContextMenu }: AnnotateSegmentsTableProps) {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux)
  const paginationModel = useAppSelector((state) => state.annotatedSegments.paginationModel);
  const rowSelectionModel = useAppSelector((state) => state.annotatedSegments.rowSelectionModel);
  const dispatch = useAppDispatch();

  // custom hooks (query)
  const annotatedSegments = useAnnotatedSegmentQuery(projectId);
  console.log(annotatedSegments.data);

  // actions
  const handleRowContextMenu = (event: React.MouseEvent<HTMLDivElement>, spanAnnotationId: number) => {
    dispatch(AnnotatedSegmentsActions.onSelectionModelChange([spanAnnotationId]));
    onRowContextMenu(event, spanAnnotationId);
  };

  return (
    <>
      {annotatedSegments.isError ? (
        <Typography variant="body1" color="inherit" component="div">
          {annotatedSegments.error?.message}
        </Typography>
      ) : (
        <SpanAnnotationTable
          rows={annotatedSegments.data?.span_annotation_ids.map((spanAnnotationId) => ({ spanAnnotationId })) || []}
          rowCount={annotatedSegments.data?.total_results || 0}
          loading={annotatedSegments.isLoading || annotatedSegments.isPreviousData}
          paginationModel={paginationModel}
          onPaginationModelChange={(model) => dispatch(AnnotatedSegmentsActions.onPaginationModelChange(model))}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={(selectionModel) =>
            dispatch(AnnotatedSegmentsActions.onSelectionModelChange(selectionModel as number[]))
          }
          onRowContextMenu={handleRowContextMenu}
        />
      )}
    </>
  );
}

export default AnnotateSegmentsTable;
