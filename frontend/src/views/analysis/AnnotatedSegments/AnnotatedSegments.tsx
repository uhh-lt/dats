import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Container,
  MenuItem,
  Portal,
  Stack,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef, GridEventListener, GridRowParams, GridValueGetterParams } from "@mui/x-data-grid";
import React, { useContext, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import AnalysisHooks from "../../../api/AnalysisHooks";
import { AnnotatedSegment, AttachedObjectType, DocumentTagRead } from "../../../api/openapi";
import { useAuth } from "../../../auth/AuthProvider";
import SdocRenderer from "../../../components/DataGrid/SdocRenderer";
import SpanAnnotationRenderer from "../../../components/DataGrid/SpanAnnotationRenderer";
import TagRenderer from "../../../components/DataGrid/TagRenderer";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../../components/GenericPositionMenu";
import SpanAnnotationEditDialog, {
  openSpanAnnotationEditDialog,
} from "../../../features/CrudDialog/SpanAnnotation/SpanAnnotationEditDialog";
import MemoAPI from "../../../features/Memo/MemoAPI";
import { AppBarContext } from "../../../layouts/TwoBarLayout";

const columns: GridColDef[] = [
  {
    field: "memo",
    headerName: "Memo",
    flex: 4,
    description: "Your comments on the annotation",
    valueGetter: (params: GridValueGetterParams) => params.row.memo?.content || "",
    renderCell: (params) => "HI",
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

    return annotatedSegments.data.reduce((previousValue, currentValue) => {
      return {
        ...previousValue,
        [currentValue.annotation.id]: currentValue,
      };
    }, {} as Record<number, AnnotatedSegment>);
  }, [annotatedSegments.data]);

  // local state
  const contextMenuRef = useRef<GenericPositionContextMenuHandle>(null);
  const [viewSegment, setViewSegment] = useState<AnnotatedSegment | undefined>(undefined);
  const [selectedSegments, setSelectedSegments] = useState<AnnotatedSegment[]>([]);

  // actions
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
  const handleRowClick: GridEventListener<"rowClick"> = (params: GridRowParams<AnnotatedSegment>, event) => {
    setViewSegment(params.row as AnnotatedSegment);

    if (event.detail >= 2) {
      openMemo(params.row);
    }
  };

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
    setViewSegment(rowData);
    contextMenuRef.current?.open({ left: event.clientX, top: event.clientY });
  };

  const handleContextMenuOpenMemo = () => {
    if (!viewSegment) return;

    contextMenuRef.current?.close();
    openMemo(viewSegment);
  };

  const handleContextMenuChangeCode = () => {
    if (!viewSegment) return;

    contextMenuRef.current?.close();
    openSpanAnnotation([viewSegment]);
  };

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Annotated Segments
        </Typography>
      </Portal>
      <Container maxWidth="xl" className="h100" style={{ display: "flex", flexDirection: "column" }} sx={{ py: 2 }}>
        <Card sx={{ mb: 2 }} elevation={2}>
          <CardContent sx={{ p: 1, pb: "8px !important" }}>
            <Stack direction="row" alignItems="center">
              {selectedSegments.length > 0 && (
                <Button onClick={handleChangeCodeClick}>
                  Change code of {selectedSegments.length} annotated segments
                </Button>
              )}
              <Box sx={{ flexGrow: 1 }} />
              <Button>Export segments</Button>
            </Stack>
          </CardContent>
        </Card>
        <Card
          sx={{ width: "100%", height: "50%", maxHeight: "300px", mb: 2 }}
          elevation={2}
          className="myFlexFillAllContainer myFlexContainer"
        >
          <CardHeader title="View Segment" />
          <CardContent className="myFlexFillAllContainer">
            <Box height="100%">
              {viewSegment ? (
                <Typography variant="body1" color="inherit" component="div">
                  {viewSegment.annotation.span_text}
                </Typography>
              ) : (
                <Typography variant="body1" color="inherit" component="div">
                  No segment selected. Click on a row to view a segment.
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
        <Card
          sx={{ width: "100%", minHeight: "225.5px" }}
          elevation={2}
          className="myFlexFillAllContainer myFlexContainer"
        >
          <CardHeader title="Annotated Segments" />
          <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
            <div className="h100" style={{ width: "100%" }}>
              {annotatedSegments.isSuccess ? (
                <DataGrid
                  rows={annotatedSegments.data}
                  columns={columns}
                  autoPageSize
                  disableRowSelectionOnClick
                  getRowId={(row: AnnotatedSegment) => row.annotation.id}
                  onRowClick={handleRowClick}
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
      </Container>
      <SpanAnnotationEditDialog projectId={projectId} />
      <GenericPositionMenu ref={contextMenuRef}>
        {viewSegment && (
          <>
            <MenuItem onClick={handleContextMenuChangeCode}>Change code</MenuItem>
            {viewSegment.memo ? (
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
