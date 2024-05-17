import NotesIcon from "@mui/icons-material/Notes";
import { Card, CardActionArea, CardContent, CardHeader, CardProps, Typography } from "@mui/material";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import UserName from "../../../components/UserName.tsx";
import AnnotationCardActionsMenu from "./AnnotationCardActionMenu.tsx";

interface SpanAnnotationCardProps {
  annotation: SpanAnnotationReadResolved;
  onClick?: () => void;
}

function SpanAnnotationCard({ annotation, onClick, ...props }: SpanAnnotationCardProps & CardProps) {
  // rendering
  return (
    <Card {...props}>
      <CardHeader
        title={
          <>
            <NotesIcon style={{ color: annotation.code.color, marginRight: "8px" }} />
            <UserName userId={annotation.user_id} />
          </>
        }
        action={
          <AnnotationCardActionsMenu annotationId={annotation.id} annotationType={AttachedObjectType.SPAN_ANNOTATION} />
        }
        titleTypographyProps={{
          variant: "body1",
          display: "flex",
          alignItems: "center",
        }}
        sx={{ pb: 0 }}
      />
      <CardActionArea onClick={onClick}>
        <CardContent sx={{ pt: 1, pb: "16px !important" }}>
          <Typography
            variant="body1"
            sx={{
              wordBreak: "break-word",
              borderLeft: "3px solid",
              borderColor: annotation.code.color,
              pl: 1,
            }}
          >
            {annotation.span_text}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default SpanAnnotationCard;
