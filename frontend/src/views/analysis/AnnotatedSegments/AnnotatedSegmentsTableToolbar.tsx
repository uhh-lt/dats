import { Box, Button } from "@mui/material";
import { GridToolbarColumnsButton, GridToolbarContainer, GridToolbarDensitySelector } from "@mui/x-data-grid";
import { useRef } from "react";
import { openSpanAnnotationEditDialog } from "../../../features/CrudDialog/SpanAnnotation/SpanAnnotationEditDialog";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import AnnotatedSegmentsFilterDialog from "./AnnotatedSegmentsFilterDialog";
import { useAllAnnotatedSegmentsQuery } from "./useAnnotatedSegmentsQuery";
import { useParams } from "react-router-dom";

function AnnotatedSegmentsTableToolbar() {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  const filterDialogAnchorRef = useRef<HTMLDivElement>(null);

  // global server state (react query)
  const allAnnotatedSegmentIds = useAllAnnotatedSegmentsQuery(projectId, (data) => {
    openSpanAnnotationEditDialog(data.span_annotation_ids);
  });

  // global client state (redux)
  const rowSelectionModel = useAppSelector((state) => state.annotatedSegments.rowSelectionModel);

  // events
  const handleChangeCodeClick = () => {
    openSpanAnnotationEditDialog(rowSelectionModel);
  };
  const handleChangeAllCodesClick = () => {
    allAnnotatedSegmentIds.refetch();
  };

  return (
    <GridToolbarContainer ref={filterDialogAnchorRef}>
      {rowSelectionModel.length > 0 ? (
        <Button size="small" onClick={handleChangeCodeClick}>
          Change code of {rowSelectionModel.length} annotated segments
        </Button>
      ) : (
        <Button size="small" onClick={handleChangeAllCodesClick}>
          Change code of all annotated segments
        </Button>
      )}
      <AnnotatedSegmentsFilterDialog anchorEl={filterDialogAnchorRef.current} buttonProps={{ size: "small" }} />
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
      <Box sx={{ flexGrow: 1 }} />
    </GridToolbarContainer>
  );
}

export default AnnotatedSegmentsTableToolbar;
