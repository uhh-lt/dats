import ReorderIcon from "@mui/icons-material/Reorder";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Portal,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef, GridValueGetterParams } from "@mui/x-data-grid";
import React, { useContext, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import AnalysisHooks from "../../../api/AnalysisHooks";
import { AnnotatedSegment, AttachedObjectType, DocumentTagRead } from "../../../api/openapi";
import { useAuth } from "../../../auth/AuthProvider";
import MemoRenderer from "../../../components/DataGrid/MemoRenderer";
import SdocRenderer from "../../../components/DataGrid/SdocRenderer";
import SpanAnnotationRenderer from "../../../components/DataGrid/SpanAnnotationRenderer";
import TagRenderer from "../../../components/DataGrid/TagRenderer";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../../components/GenericPositionMenu";
import SpanAnnotationEditDialog, {
  openSpanAnnotationEditDialog,
} from "../../../features/CrudDialog/SpanAnnotation/SpanAnnotationEditDialog";
import MemoAPI from "../../../features/Memo/MemoAPI";
import { AppBarContext } from "../../../layouts/TwoBarLayout";
import SpanAnnotationCard from "./SpanAnnotationCard";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { AnnotatedSegmentsActions } from "./annotatedSegmentsSlice";

const columns: GridColDef[] = [
  {
    field: "memo",
    headerName: "Memo",
    flex: 4,
    description: "Your comments on the annotation",
    valueGetter: (params: GridValueGetterParams) => params.row.memo?.content || "",
    renderCell: (params) => (params.row.memo ? <MemoRenderer memo={params.row.memo} /> : "empty"),
  },
  {
    field: "sdoc",
    headerName: "Document",
    flex: 2,
    valueGetter: (params: GridValueGetterParams) => params.row.sdoc.filename,
    renderCell: (params) => <SdocRenderer sdoc={params.row.sdoc.id} link />,
  },
  {
    field: "tags",
    headerName: "Tags",
    flex: 1,
    renderCell: (params) => (
      <Stack>
        {params.row.tags.map((tag: DocumentTagRead) => (
          <TagRenderer key={tag.id} tag={tag.id} />
        ))}
      </Stack>
    ),
  },
  {
    field: "annotation",
    headerName: "Preview",
    flex: 4,
    renderCell: (params) => <SpanAnnotationRenderer spanAnnotation={params.row.annotation.id} />,
  },
];

function AnnotatedSegments() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react router)
  const { user } = useAuth();
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global server state
  const annotatedSegments = AnalysisHooks.useAnnotatedSegments(projectId, user.data?.id);
  const annotatedSegmentsMap = React.useMemo(() => {
    // we have to transform the data, better do this elsewhere?
    if (!annotatedSegments.data) return [];

    return annotatedSegments.data.reduce(
      (previousValue, currentValue) => {
        return {
          ...previousValue,
          [currentValue.annotation.id]: currentValue,
        };
      },
      {} as Record<number, AnnotatedSegment>,
    );
  }, [annotatedSegments.data]);

  // global client state
  const dispatch = useAppDispatch();
  const contextSize = useAppSelector((state) => state.annotatedSegments.contextSize);

  // local state
  const contextMenuRef = useRef<GenericPositionContextMenuHandle>(null);
  const [selectedSegments, setSelectedSegments] = useState<AnnotatedSegment[]>([]);
  const [isSplitView, setIsSplitView] = useState<boolean>(false);

  // actions
  const handleClickSplitView = () => {
    setIsSplitView(!isSplitView);
  };

  const openMemo = (annotatedSegment: AnnotatedSegment) => {
    MemoAPI.openMemo({
      memoId: annotatedSegment.memo?.id,
      attachedObjectType: annotatedSegment.memo?.attached_object_type || AttachedObjectType.SPAN_ANNOTATION,
      attachedObjectId: annotatedSegment.memo?.attached_object_id || annotatedSegment.annotation.id,
    });
  };

  const openSpanAnnotation = (segments: AnnotatedSegment[]) => {
    openSpanAnnotationEditDialog(segments.map((segment) => segment.annotation));
  };

  // events
  const handleChangeCodeClick = () => {
    openSpanAnnotation(selectedSegments);
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!event.currentTarget) {
      return;
    }
    const rowId = Number((event.currentTarget as HTMLDivElement).getAttribute("data-id"));
    const rowData = annotatedSegmentsMap[rowId];
    setSelectedSegments([rowData]);
    contextMenuRef.current?.open({ left: event.clientX, top: event.clientY });
  };

  const handleContextMenuOpenMemo = () => {
    if (selectedSegments.length !== 1) return;

    contextMenuRef.current?.close();
    openMemo(selectedSegments[0]);
  };

  const handleContextMenuChangeCode = () => {
    if (selectedSegments.length !== 1) return;

    contextMenuRef.current?.close();
    openSpanAnnotation([selectedSegments[0]]);
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
                {selectedSegments.length > 0 && (
                  <Button onClick={handleChangeCodeClick}>
                    Change code of {selectedSegments.length} annotated segments
                  </Button>
                )}
                <Box sx={{ flexGrow: 1 }} />
                <TextField
                  label="Context Size"
                  type="number"
                  size="small"
                  value={contextSize}
                  onChange={(event) => dispatch(AnnotatedSegmentsActions.setContextSize(parseInt(event.target.value)))}
                />
                <Button>Export segments</Button>
                <Tooltip title="Split/not split view">
                  <IconButton onClick={handleClickSplitView}>
                    {isSplitView ? <ReorderIcon /> : <VerticalSplitIcon />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </CardContent>
          </Card>

          {!isSplitView && selectedSegments.length > 0 && (
            <SpanAnnotationCard
              key={selectedSegments[selectedSegments.length - 1].annotation.id}
              annotationId={selectedSegments[selectedSegments.length - 1].annotation.id}
              sx={{ mb: 2, flexShrink: 0 }}
            />
          )}

          <Card sx={{ width: "100%" }} elevation={2} className="myFlexFillAllContainer myFlexContainer h100">
            <CardHeader title="Annotated Segments" />
            <CardContent className="myFlexFillAllContainer h100" style={{ padding: 0 }}>
              <div className="h100" style={{ width: "100%" }}>
                {annotatedSegments.isSuccess ? (
                  <DataGrid
                    rows={annotatedSegments.data}
                    columns={columns}
                    autoPageSize
                    getRowId={(row: AnnotatedSegment) => row.annotation.id}
                    style={{ border: "none" }}
                    checkboxSelection
                    onRowSelectionModelChange={(selectionModel) =>
                      setSelectedSegments(selectionModel.map((id) => annotatedSegmentsMap[id as number]))
                    }
                    slotProps={{
                      row: {
                        onContextMenu: handleContextMenu,
                      },
                    }}
                  />
                ) : annotatedSegments.isLoading ? (
                  <CircularProgress />
                ) : (
                  <Typography variant="body1" color="inherit" component="div">
                    {annotatedSegments.error?.message}
                  </Typography>
                )}
              </div>
            </CardContent>
          </Card>
        </Grid>
        {isSplitView && (
          <Grid item md={6} className="h100WithScroll">
            {selectedSegments.length > 0 ? (
              selectedSegments.map((segment) => (
                <SpanAnnotationCard key={segment.annotation.id} annotationId={segment.annotation.id} sx={{ mb: 1 }} />
              ))
            ) : (
              <Typography variant="body1" color="inherit" component="div">
                No segment selected. Click on a row to view a segment.
              </Typography>
            )}
          </Grid>
        )}
      </Grid>
      <SpanAnnotationEditDialog projectId={projectId} />
      <GenericPositionMenu ref={contextMenuRef}>
        {selectedSegments.length === 1 && (
          <>
            <MenuItem onClick={handleContextMenuChangeCode}>Change code</MenuItem>
            {selectedSegments[0].memo ? (
              <MenuItem onClick={handleContextMenuOpenMemo}>Edit memo</MenuItem>
            ) : (
              <MenuItem onClick={handleContextMenuOpenMemo}>Create memo</MenuItem>
            )}
          </>
        )}
      </GenericPositionMenu>
    </Box>
  );
}

export default AnnotatedSegments;
