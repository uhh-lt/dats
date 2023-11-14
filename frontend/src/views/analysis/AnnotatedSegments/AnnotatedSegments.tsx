import ReorderIcon from "@mui/icons-material/Reorder";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  IconButton,
  MenuItem,
  Portal,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import { AttachedObjectType } from "../../../api/openapi";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../../components/GenericPositionMenu";
import SpanAnnotationEditDialog, {
  openSpanAnnotationEditDialog,
} from "../../../features/CrudDialog/SpanAnnotation/SpanAnnotationEditDialog";
import FilterDialog from "../../../features/FilterDialog/FilterDialog";
import MemoAPI from "../../../features/Memo/MemoAPI";
import { AppBarContext } from "../../../layouts/TwoBarLayout";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import AnnotatedSegmentsTable from "./AnnotatedSegmentsTable";
import AnnotatedSegmentsUserSelector from "./AnnotatedSegmentsUserSelector";
import SpanAnnotationCard from "./SpanAnnotationCard";
import SpanAnnotationCardList from "./SpanAnnotationCardList";
import { AnnotatedSegmentsActions } from "./annotatedSegmentsSlice";

function AnnotatedSegments() {
  const appBarContainerRef = useContext(AppBarContext);

  // local client state
  const contextMenuRef = useRef<GenericPositionContextMenuHandle>(null);
  const filterDialogAnchorRef = useRef<HTMLDivElement>(null);

  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux)
  const contextSize = useAppSelector((state) => state.annotatedSegments.contextSize);
  const isSplitView = useAppSelector((state) => state.annotatedSegments.isSplitView);
  const rowSelectionModel = useAppSelector((state) => state.annotatedSegments.rowSelectionModel);
  const dispatch = useAppDispatch();

  // actions
  const handleClickSplitView = () => {
    dispatch(AnnotatedSegmentsActions.toggleSplitView());
  };

  const openMemo = (spanAnnotationId: number) => {
    MemoAPI.openMemo({
      attachedObjectType: AttachedObjectType.SPAN_ANNOTATION,
      attachedObjectId: spanAnnotationId,
    });
  };

  const openSpanAnnotation = (spanAnnotationIds: number[]) => {
    openSpanAnnotationEditDialog(spanAnnotationIds);
  };

  // events
  const handleChangeCodeClick = () => {
    openSpanAnnotation(rowSelectionModel);
  };

  const handleRowContextMenu = (event: React.MouseEvent<HTMLDivElement>, spanAnnotationId: number) => {
    contextMenuRef.current?.open({ left: event.clientX, top: event.clientY });
  };

  const handleContextMenuOpenMemo = () => {
    if (rowSelectionModel.length !== 1) return;

    contextMenuRef.current?.close();
    openMemo(rowSelectionModel[0]);
  };

  const handleContextMenuChangeCode = () => {
    if (rowSelectionModel.length !== 1) return;

    contextMenuRef.current?.close();
    openSpanAnnotation([rowSelectionModel[0]]);
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
                {rowSelectionModel.length > 0 && (
                  <Button onClick={handleChangeCodeClick}>
                    Change code of {rowSelectionModel.length} annotated segments
                  </Button>
                )}
                <FilterDialog anchorEl={filterDialogAnchorRef.current} />
                <Box sx={{ flexGrow: 1 }} />
                <AnnotatedSegmentsUserSelector projectId={projectId} mr={1} />
                <TextField
                  label="Context Size"
                  type="number"
                  size="small"
                  value={contextSize}
                  onChange={(event) => dispatch(AnnotatedSegmentsActions.setContextSize(parseInt(event.target.value)))}
                />
                <Tooltip title={"Export segments"}>
                  <span>
                    <IconButton disabled>
                      <SaveAltIcon />
                    </IconButton>
                  </span>
                </Tooltip>
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
              key={rowSelectionModel.length > 0 ? rowSelectionModel[rowSelectionModel.length - 1] : undefined}
              annotationId={rowSelectionModel.length > 0 ? rowSelectionModel[rowSelectionModel.length - 1] : undefined}
              sx={{ mb: 2, flexShrink: 0 }}
            />
          )}

          <Card sx={{ width: "100%" }} elevation={2} className="myFlexFillAllContainer myFlexContainer h100">
            <CardHeader title="Annotated Segments" />
            <CardContent className="myFlexFillAllContainer h100" style={{ padding: 0 }}>
              <div className="h100" style={{ width: "100%" }} ref={filterDialogAnchorRef}>
                <AnnotatedSegmentsTable onRowContextMenu={handleRowContextMenu} />
              </div>
            </CardContent>
          </Card>
        </Grid>
        {isSplitView && <SpanAnnotationCardList spanAnnotationIds={rowSelectionModel} />}
      </Grid>
      <SpanAnnotationEditDialog projectId={projectId} />
      <GenericPositionMenu ref={contextMenuRef}>
        <MenuItem onClick={handleContextMenuChangeCode}>Change code</MenuItem>
        <MenuItem onClick={handleContextMenuOpenMemo}>Edit memo</MenuItem>
      </GenericPositionMenu>
    </Box>
  );
}

export default AnnotatedSegments;
