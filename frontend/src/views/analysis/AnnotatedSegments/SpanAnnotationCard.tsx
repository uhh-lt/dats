import EditIcon from "@mui/icons-material/Edit";
import {
  Card,
  CardActions,
  CardContent,
  CardProps,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import SdocHooks from "../../../api/SdocHooks";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks";
import { AttachedObjectType } from "../../../api/openapi";
import CodeRenderer from "../../../components/DataGrid/CodeRenderer";
import { openSpanAnnotationEditDialog } from "../../../features/CrudDialog/SpanAnnotation/SpanAnnotationEditDialog";
import MemoButton from "../../../features/Memo/MemoButton";
import { useAppSelector } from "../../../plugins/ReduxHooks";

interface SpanAnnotationCardProps {
  annotationId: number;
}

function SpanAnnotationCard({ annotationId, ...props }: SpanAnnotationCardProps & Omit<CardProps, "elevation">) {
  // global server state (react-query)
  const spanAnnotation = SpanAnnotationHooks.useGetAnnotation(annotationId);
  const sdocContent = SdocHooks.useGetDocumentContent(spanAnnotation.data?.sdoc_id);

  // global client state (redux)
  const contextSize = useAppSelector((state) => state.annotatedSegments.contextSize);

  const handleChangeCodeClick = () => {
    if (!spanAnnotation.data) return;

    openSpanAnnotationEditDialog([spanAnnotation.data]);
  };

  return (
    <Card elevation={2} {...props}>
      {spanAnnotation.isSuccess && sdocContent.isSuccess ? (
        <>
          <CardContent sx={{ pb: "8px !important" }}>
            <Typography variant="body1" color="inherit" component="div" sx={{ mt: 2 }}>
              {sdocContent.data.content.substring(spanAnnotation.data.begin - contextSize, spanAnnotation.data.begin)}
              <b>{sdocContent.data.content.substring(spanAnnotation.data.begin, spanAnnotation.data.end)}</b>
              {sdocContent.data.content.substring(spanAnnotation.data.end, spanAnnotation.data.end + contextSize)}
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
      ) : spanAnnotation.isLoading || sdocContent.isLoading ? (
        <CircularProgress />
      ) : (
        <Typography variant="body1" color="inherit" component="div">
          {spanAnnotation.error?.message}
          {sdocContent.error?.message}
        </Typography>
      )}
    </Card>
  );
}

export default SpanAnnotationCard;
