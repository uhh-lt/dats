import NotesIcon from "@mui/icons-material/Notes";
import { Card, CardActionArea, CardContent, CardHeader, Typography } from "@mui/material";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationReadResolvedCode } from "../../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";
import UserName from "../../../components/UserName.tsx";
import AnnotationCardActionsMenu from "./AnnotationCardActionMenu.tsx";
import { AnnotationCardProps } from "./AnnotationCardProps.ts";

function BBoxAnnotationCard({ annotation, onClick, cardProps }: AnnotationCardProps<BBoxAnnotationReadResolvedCode>) {
  return (
    <Card {...cardProps}>
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
            {annotation.x_min}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default BBoxAnnotationCard;
