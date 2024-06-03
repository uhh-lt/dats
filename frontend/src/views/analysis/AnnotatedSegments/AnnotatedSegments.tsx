import ReorderIcon from "@mui/icons-material/Reorder";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import { Box, Card, CardContent, Grid, IconButton, Portal, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import SpanAnnotationEditDialog from "../../../components/SpanAnnotation/SpanAnnotationEditDialog.tsx";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotatedSegmentsTable from "./AnnotatedSegmentsTable.tsx";
import SpanAnnotationCard from "./SpanAnnotationCard.tsx";
import SpanAnnotationCardList from "./SpanAnnotationCardList.tsx";
import { AnnotatedSegmentsActions } from "./annotatedSegmentsSlice.ts";

function AnnotatedSegments() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux)
  const contextSize = useAppSelector((state) => state.annotatedSegments.contextSize);
  const isSplitView = useAppSelector((state) => state.annotatedSegments.isSplitView);
  const rowSelectionModel = useAppSelector((state) => state.annotatedSegments.rowSelectionModel);
  const selectedAnnotationIds = useMemo(() => {
    return Object.entries(rowSelectionModel)
      .filter(([, value]) => value)
      .map(([key]) => parseInt(key));
  }, [rowSelectionModel]);

  const dispatch = useAppDispatch();

  // actions
  const handleClickSplitView = () => {
    dispatch(AnnotatedSegmentsActions.toggleSplitView());
  };

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Annotated Segments
        </Typography>
      </Portal>
      <Grid container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
        <Grid item md={isSplitView ? 6 : 12} className="myFlexContainer h100">
          <Card sx={{ mb: 2, flexShrink: 0 }} elevation={2}>
            <CardContent sx={{ p: 1, pb: "8px !important" }}>
              <Stack direction="row" alignItems="center">
                <Box sx={{ flexGrow: 1 }} />
                <TextField
                  label="Context Size"
                  type="number"
                  size="small"
                  value={contextSize}
                  onChange={(event) => dispatch(AnnotatedSegmentsActions.setContextSize(parseInt(event.target.value)))}
                />
                <Tooltip title="Split/not split view">
                  <IconButton onClick={handleClickSplitView}>
                    {isSplitView ? <ReorderIcon /> : <VerticalSplitIcon />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </CardContent>
          </Card>

          {!isSplitView && (
            <SpanAnnotationCard
              key={
                selectedAnnotationIds.length > 0 ? selectedAnnotationIds[selectedAnnotationIds.length - 1] : undefined
              }
              annotationId={
                selectedAnnotationIds.length > 0 ? selectedAnnotationIds[selectedAnnotationIds.length - 1] : undefined
              }
              sx={{ mb: 2, flexShrink: 0 }}
            />
          )}

          <AnnotatedSegmentsTable cardProps={{ elevation: 2, className: "myFlexFillAllContainer myFlexContainer" }} />
        </Grid>
        {isSplitView && <SpanAnnotationCardList spanAnnotationIds={selectedAnnotationIds} />}
      </Grid>
      <SpanAnnotationEditDialog projectId={projectId} />
    </Box>
  );
}

export default AnnotatedSegments;
