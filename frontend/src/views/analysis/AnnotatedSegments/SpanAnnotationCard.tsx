import EditIcon from "@mui/icons-material/Edit";
import {
  Card,
  CardActions,
  CardContent,
  CardProps,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import SdocHooks from "../../../api/SdocHooks.ts";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import MemoButton from "../../../components/Memo/MemoButton.tsx";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";

interface SpanAnnotationCardProps {
  annotationId: number | undefined;
}

function SpanAnnotationCard({ annotationId, ...props }: SpanAnnotationCardProps & Omit<CardProps, "elevation">) {
  // global server state (react-query)
  const spanAnnotation = SpanAnnotationHooks.useGetAnnotation(annotationId);
  const sdoc = SdocHooks.useGetDocument(spanAnnotation.data?.sdoc_id);

  // global client state (redux)
  const contextSize = useAppSelector((state) => state.annotatedSegments.contextSize);
  const dispatch = useAppDispatch();

  const handleChangeCodeClick = () => {
    if (annotationId === undefined) return;

    dispatch(CRUDDialogActions.openSpanAnnotationEditDialog({ spanAnnotationIds: [annotationId] }));
  };

  return (
    <Card elevation={2} {...props}>
      <CardContent sx={{ pb: "8px !important" }}>
        {annotationId === undefined ? (
          <Typography variant="body1" component="div" sx={{ mt: 2 }}>
            <i>Select an annotation to view it & it's context :)</i>
          </Typography>
        ) : spanAnnotation.isSuccess && sdoc.isSuccess ? (
          <Typography variant="body1" component="div" sx={{ mt: 2 }}>
            {sdoc.data.content.substring(spanAnnotation.data.begin - contextSize, spanAnnotation.data.begin)}
            <b>{sdoc.data.content.substring(spanAnnotation.data.begin, spanAnnotation.data.end)}</b>
            {sdoc.data.content.substring(spanAnnotation.data.end, spanAnnotation.data.end + contextSize)}
          </Typography>
        ) : spanAnnotation.isLoading || sdoc.isLoading ? (
          <CircularProgress />
        ) : (
          <Typography variant="body1" component="div">
            {spanAnnotation.error?.message}
            {sdoc.error?.message}
          </Typography>
        )}
      </CardContent>
      <CardActions>
        <MemoButton
          disabled={spanAnnotation.data === undefined}
          attachedObjectId={spanAnnotation.data?.id}
          attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
        />
        <Tooltip title={"Change code"}>
          <span>
            <IconButton disabled={spanAnnotation.data === undefined} onClick={handleChangeCodeClick}>
              <EditIcon />
            </IconButton>
          </span>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

export default SpanAnnotationCard;
