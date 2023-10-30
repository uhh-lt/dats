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
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks";
import { AttachedObjectType } from "../../../api/openapi";
import CodeRenderer from "../../../components/DataGrid/CodeRenderer";
import { openSpanAnnotationEditDialog } from "../../../features/CrudDialog/SpanAnnotation/SpanAnnotationEditDialog";
import MemoButton from "../../../features/Memo/MemoButton";

interface SpanAnnotationCardProps {
  annotationId: number;
}

function SpanAnnotationCard({ annotationId, ...props }: SpanAnnotationCardProps & Omit<CardProps, "elevation">) {
  const spanAnnotation = SpanAnnotationHooks.useGetAnnotation(annotationId);

  const handleChangeCodeClick = () => {
    if (!spanAnnotation.data) return;

    openSpanAnnotationEditDialog([spanAnnotation.data]);
  };

  return (
    <Card elevation={2} {...props}>
      {spanAnnotation.isSuccess ? (
        <>
          <CardContent sx={{ pb: "8px !important" }}>
            <Stack direction="row">
              Code: <CodeRenderer code={spanAnnotation.data.code} />
            </Stack>
            <Stack direction="row">
              Document: Coming soon... {/*<SdocRenderer sdoc={spanAnnotation.sdoc.id} link /> */}
            </Stack>
            <Typography variant="body1" color="inherit" component="div" sx={{ mt: 2 }}>
              {spanAnnotation.data.span_text}
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
      ) : spanAnnotation.isLoading ? (
        <CircularProgress />
      ) : (
        <Typography variant="body1" color="inherit" component="div">
          {spanAnnotation.error?.message}
        </Typography>
      )}
    </Card>
  );
}

export default SpanAnnotationCard;
