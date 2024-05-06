import SaveAltIcon from "@mui/icons-material/SaveAlt";
import { Button, IconButton, Tooltip } from "@mui/material";
import { useParams } from "react-router-dom";
import { AnnotatedSegmentsColumns } from "../../../api/openapi/models/AnnotatedSegmentsColumns.ts";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import SATToolbar, { SATToolbarProps } from "../../../components/SpanAnnotationTable/SATToolbar.tsx";
import { CRUDDialogActions } from "../../../features/CrudDialog/dialogSlice.ts";
import { MyFilter } from "../../../features/FilterDialog/filterUtils.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { selectAnnotationIds } from "./annotatedSegmentsSlice.ts";

function AnnotatedSegmentsTableToolbar(props: SATToolbarProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global client state
  const filter = useAppSelector((state) => state.satFilter.filter["root"]);

  // global client state (redux)
  const selectedAnnotationIds = useAppSelector(selectAnnotationIds);
  const dispatch = useAppDispatch();

  // events
  const handleChangeCodeClick = () => {
    dispatch(CRUDDialogActions.openSpanAnnotationEditDialog({ spanAnnotationIds: selectedAnnotationIds }));
  };
  const handleChangeAllCodesClick = () => {
    AnalysisService.annotatedSegments({
      projectId: projectId!,
      userId: props.selectedUserId,
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
    <SATToolbar
      {...props}
      leftChildren={
        <>
          {selectedAnnotationIds.length > 0 ? (
            <Button size="small" onClick={handleChangeCodeClick}>
              Change code of {selectedAnnotationIds.length} annotated segments
            </Button>
          ) : (
            <Button size="small" onClick={handleChangeAllCodesClick}>
              Change code of all annotated segments
            </Button>
          )}
        </>
      }
      rightChildren={
        <Tooltip title={"Export segments"}>
          <span>
            <IconButton disabled>
              <SaveAltIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    />
  );
}

export default AnnotatedSegmentsTableToolbar;
