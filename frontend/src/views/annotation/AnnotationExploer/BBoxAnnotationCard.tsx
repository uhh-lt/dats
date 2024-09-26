import NotesIcon from "@mui/icons-material/Notes";
import { Card, CardActionArea, CardContent, CardHeader, CircularProgress } from "@mui/material";
import SdocHooks from "../../../api/SdocHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationReadResolved } from "../../../api/openapi/models/BBoxAnnotationReadResolved.ts";
import UserName from "../../../components/User/UserName.tsx";
import ImageCropper from "../../whiteboard/nodes/ImageCropper.tsx";
import AnnotationCardActionsMenu from "./AnnotationCardActionMenu.tsx";
import { AnnotationCardProps } from "./AnnotationCardProps.ts";

function BBoxAnnotationCard({ annotation, onClick, cardProps }: AnnotationCardProps<BBoxAnnotationReadResolved>) {
  const sdoc = SdocHooks.useGetDocument(annotation.sdoc_id);

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
          <AnnotationCardActionsMenu annotationId={annotation.id} annotationType={AttachedObjectType.BBOX_ANNOTATION} />
        }
        titleTypographyProps={{
          variant: "body1",
          display: "flex",
          alignItems: "center",
        }}
        sx={{ pb: 0 }}
      />
      <CardActionArea onClick={onClick}>
        <CardContent sx={{ pt: 1, pb: "16px !important", textAlign: "center" }}>
          {sdoc.isSuccess ? (
            <ImageCropper
              imageUrl={sdoc.data.content}
              x={annotation.x_min}
              y={annotation.y_min}
              width={annotation.x_max - annotation.x_min}
              targetWidth={((annotation.x_max - annotation.x_min) * 100) / (annotation.y_max - annotation.y_min)}
              height={annotation.y_max - annotation.y_min}
              targetHeight={100}
              style={{
                border: "4px solid " + annotation.code.color,
              }}
            />
          ) : (
            <CircularProgress />
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default BBoxAnnotationCard;
