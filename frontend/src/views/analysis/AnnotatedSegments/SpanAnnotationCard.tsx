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
import SdocHooks from "../../../api/SdocHooks";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks";
import { AttachedObjectType } from "../../../api/openapi";
import { openSpanAnnotationEditDialog } from "../../../features/CrudDialog/SpanAnnotation/SpanAnnotationEditDialog";
import MemoButton from "../../../features/Memo/MemoButton";
import { useAppSelector } from "../../../plugins/ReduxHooks";

interface SpanAnnotationCardProps {
  annotationId: number;
}

function SpanAnnotationCard({ annotationId, ...props }: SpanAnnotationCardProps & Omit<CardProps, "elevation">) {
  // global server state (react-query)
  const spanAnnotation = SpanAnnotationHooks.useGetAnnotation(annotationId);
  const sdoc = SdocHooks.useGetDocument(spanAnnotation.data?.sdoc_id);

  // global client state (redux)
  const contextSize = useAppSelector((state) => state.annotatedSegments.contextSize);

  const handleChangeCodeClick = () => {
    openSpanAnnotationEditDialog([annotationId]);
  };

  return (
    <Card elevation={2} {...props}>
      {spanAnnotation.isSuccess && sdoc.isSuccess ? (
        <>
          <CardContent sx={{ pb: "8px !important" }}>
            <Typography variant="body1" color="inherit" component="div" sx={{ mt: 2 }}>
              {sdoc.data.content.substring(spanAnnotation.data.begin - contextSize, spanAnnotation.data.begin)}
              <b>{sdoc.data.content.substring(spanAnnotation.data.begin, spanAnnotation.data.end)}</b>
              {sdoc.data.content.substring(spanAnnotation.data.end, spanAnnotation.data.end + contextSize)}
            </Typography>
          </CardContent>
          <CardActions>
            <MemoButton
              attachedObjectId={spanAnnotation.data.id}
              attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
            />
            <Tooltip title={"Change code"}>
              <span>
                <IconButton color="inherit" onClick={handleChangeCodeClick}>
                  <EditIcon />
                </IconButton>
              </span>
            </Tooltip>
          </CardActions>
        </>
      ) : spanAnnotation.isLoading || sdoc.isLoading ? (
        <CircularProgress />
      ) : (
        <Typography variant="body1" color="inherit" component="div">
          {spanAnnotation.error?.message}
          {sdoc.error?.message}
        </Typography>
      )}
    </Card>
  );
}

export default SpanAnnotationCard;
