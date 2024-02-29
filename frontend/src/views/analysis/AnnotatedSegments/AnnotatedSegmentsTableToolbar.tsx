import { Box, Button } from "@mui/material";
import { MRT_ShowHideColumnsButton, MRT_TableInstance, MRT_ToggleDensePaddingButton } from "material-react-table";
import { useRef } from "react";
import { useParams } from "react-router-dom";
import { AnnotatedSegmentsColumns } from "../../../api/openapi/models/AnnotatedSegmentsColumns.ts";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { CRUDDialogActions } from "../../../features/CrudDialog/dialogSlice.ts";
import { MyFilter } from "../../../features/FilterDialog/filterUtils.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotatedSegmentsFilterDialog from "./AnnotatedSegmentsFilterDialog.tsx";
import { selectAnnotationIds } from "./annotatedSegmentsSlice.ts";

interface AnnotatedSegmentsTableToolbarProps {
  table: MRT_TableInstance<{ spanAnnotationId: number }>;
}

function AnnotatedSegmentsTableToolbar({ table }: AnnotatedSegmentsTableToolbarProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  const filterDialogAnchorRef = useRef<HTMLDivElement>(null);

  // global client state
  const userIds = useAppSelector((state) => state.annotatedSegments.selectedUserIds);
  const filter = useAppSelector((state) => state.annotatedSegmentsFilter.filter["root"]);

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
      requestBody: {
        filter: filter as MyFilter<AnnotatedSegmentsColumns>,
        user_ids: userIds,
        sorts: [],
      },
      page: 0,
      pageSize: 1000,
    }).then((data) => {
      dispatch(CRUDDialogActions.openSpanAnnotationEditDialog({ spanAnnotationIds: data.span_annotation_ids }));
    });
  };

  return (
    <Box>
      {selectedAnnotationIds.length > 0 ? (
        <Button size="small" onClick={handleChangeCodeClick}>
          Change code of {selectedAnnotationIds.length} annotated segments
        </Button>
      ) : (
        <Button size="small" onClick={handleChangeAllCodesClick}>
          Change code of all annotated segments
        </Button>
      )}
      <AnnotatedSegmentsFilterDialog anchorEl={filterDialogAnchorRef.current} buttonProps={{ size: "small" }} />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <Box sx={{ flexGrow: 1 }} />
    </Box>
  );
}

export default AnnotatedSegmentsTableToolbar;
