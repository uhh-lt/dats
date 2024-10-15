import { Box, Grid2, Portal, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import SpanAnnotationEditDialog from "../../../components/SpanAnnotation/SpanAnnotationEditDialog.tsx";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotatedSegmentsTable from "./AnnotatedSegmentsTable.tsx";
import AnnotatedSegmentsToolbar from "./AnnotatedSegmentsToolbar.tsx";
import SpanAnnotationCard from "./SpanAnnotationCard.tsx";
import SpanAnnotationCardList from "./SpanAnnotationCardList.tsx";

function AnnotatedSegments() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux)
  const isSplitView = useAppSelector((state) => state.annotatedSegments.isSplitView);
  const rowSelectionModel = useAppSelector((state) => state.annotatedSegments.rowSelectionModel);
  const selectedAnnotationIds = useMemo(() => {
    return Object.entries(rowSelectionModel)
      .filter(([, value]) => value)
      .map(([key]) => parseInt(key));
  }, [rowSelectionModel]);

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" component="div">
          Annotated Segments
        </Typography>
      </Portal>
      <Grid2 container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
        <Grid2 size={{ md: isSplitView ? 6 : 12 }} className="myFlexContainer h100">
          {!isSplitView && (
            <>
              <AnnotatedSegmentsToolbar />
              <SpanAnnotationCard
                key={
                  selectedAnnotationIds.length > 0 ? selectedAnnotationIds[selectedAnnotationIds.length - 1] : undefined
                }
                annotationId={
                  selectedAnnotationIds.length > 0 ? selectedAnnotationIds[selectedAnnotationIds.length - 1] : undefined
                }
                sx={{ mb: 2, flexShrink: 0 }}
              />
            </>
          )}

          <AnnotatedSegmentsTable cardProps={{ elevation: 2, className: "myFlexFillAllContainer myFlexContainer" }} />
        </Grid2>
        {isSplitView && (
          <Grid2 size={{ md: 6 }} className="myFlexContainer h100">
            <AnnotatedSegmentsToolbar />
            <SpanAnnotationCardList spanAnnotationIds={selectedAnnotationIds} />
          </Grid2>
        )}
      </Grid2>
      <SpanAnnotationEditDialog projectId={projectId} />
    </Box>
  );
}

export default AnnotatedSegments;
