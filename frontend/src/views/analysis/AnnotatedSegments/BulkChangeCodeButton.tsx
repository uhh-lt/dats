import { Button, Stack } from "@mui/material";
import { useParams } from "react-router-dom";
import { AnnotatedSegmentsColumns } from "../../../api/openapi/models/AnnotatedSegmentsColumns.ts";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { SATToolbarProps } from "../../../components/SpanAnnotationTable/SATToolbar.tsx";
import { CRUDDialogActions } from "../../../features/CrudDialog/dialogSlice.ts";
import { MyFilter } from "../../../features/FilterDialog/filterUtils.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";

function BulkChangeCodeButton({
  selectedAnnotations,
  selectedUserId,
  filterName,
}: SATToolbarProps & { filterName: string }) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global client state
  const filter = useAppSelector((state) => state.satFilter.filter[filterName]);

  // global client state (redux)
  const dispatch = useAppDispatch();

  // actions
  const handleChangeCodeClick = () => {
    dispatch(
      CRUDDialogActions.openSpanAnnotationEditDialog({ spanAnnotationIds: selectedAnnotations.map((row) => row.id) }),
    );
  };
  const handleChangeAllCodesClick = () => {
    AnalysisService.annotatedSegments({
      projectId: projectId!,
      userId: selectedUserId,
      requestBody: {
        filter: filter as MyFilter<AnnotatedSegmentsColumns>,
        sorts: [],
      },
      page: 0,
      pageSize: 1000,
    }).then((data) => {
      dispatch(CRUDDialogActions.openSpanAnnotationEditDialog({ spanAnnotationIds: data.data.map((row) => row.id) }));
    });
  };

  return (
    <Stack direction={"row"} spacing={1} alignItems="center" p={0.5} height={48}>
      {selectedAnnotations.length > 0 ? (
        <Button size="small" onClick={handleChangeCodeClick}>
          Change code of {selectedAnnotations.length} annotated segments
        </Button>
      ) : (
        <Button size="small" onClick={handleChangeAllCodesClick}>
          Change code of all annotated segments
        </Button>
      )}
    </Stack>
  );
}

export default BulkChangeCodeButton;
