import { Card, CardActionArea, CardContent, CardHeader, Divider, Stack, Typography } from "@mui/material";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { SentenceAnnotationReadResolved } from "../../../api/openapi/models/SentenceAnnotationReadResolved.ts";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks.ts";
import CodeRenderer from "../../../components/Code/CodeRenderer.tsx";
import UserName from "../../../components/User/UserName.tsx";
import AnnotationCardActionsMenu from "./AnnotationCardActionMenu.tsx";
import AnnotationCardMemo from "./AnnotationCardMemo.tsx";
import { AnnotationCardProps } from "./types/AnnotationCardProps.ts";

function SentenceAnnotationCard({
  isSelected,
  annotation,
  onClick,
  cardProps,
}: AnnotationCardProps<SentenceAnnotationReadResolved>) {
  return (
    <Card {...cardProps}>
      <CardHeader
        title={<CodeRenderer key={annotation.code.id} code={annotation.code} />}
        action={
          <AnnotationCardActionsMenu
            annotationId={annotation.id}
            annotationType={AttachedObjectType.SPAN_ANNOTATION}
            iconButtonProps={{ size: "small" }}
          />
        }
        titleTypographyProps={{
          variant: "body1",
          display: "flex",
          alignItems: "center",
        }}
        sx={{ px: 1, py: 0.5 }}
      />
      <Divider />
      <CardActionArea onClick={onClick}>
        <CardContent sx={{ pr: 1, pl: 1.5, pt: 1, pb: "0px !important" }}>
          <Typography
            variant="body1"
            sx={{
              wordBreak: "break-word",
              borderLeft: "3px solid",
              borderColor: annotation.code.color,
              pl: 1,
            }}
          >
            This annotation spans sentence {annotation.sentence_id_start + 1} - {annotation.sentence_id_end + 1}.
          </Typography>
          <Stack direction="row" justifyContent="end" width="100%">
            <Typography variant="subtitle2" color="textDisabled" fontSize={12}>
              <UserName userId={annotation.user_id} />
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
      {isSelected && (
        <>
          <Divider />
          <AnnotationCardMemo
            annotationId={annotation.id}
            annotationType={AttachedObjectType.SPAN_ANNOTATION}
            codeName={annotation.code.name}
            annotationText={"Sentence"}
            useGetAnnotationMemo={SpanAnnotationHooks.useGetUserMemo}
          />
        </>
      )}
    </Card>
  );
}

export default SentenceAnnotationCard;
