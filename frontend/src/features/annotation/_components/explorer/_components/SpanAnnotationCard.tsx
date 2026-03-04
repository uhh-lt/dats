import { AttachedObjectType } from "@api/models/AttachedObjectType";
import { SpanAnnotationRead } from "@api/models/SpanAnnotationRead";
import { CodeRenderer } from "@core/code/CodeRenderer";
import { UserRenderer } from "@core/user/UserRenderer";
import { Card, CardActionArea, CardContent, CardHeader, Divider, Stack, Typography } from "@mui/material";
import { AnnotationCardProps } from "../_types/AnnotationCardProps";
import { AnnotationCardActionsMenu } from "./AnnotationCardActionMenu";
import { AnnotationCardMemo } from "./AnnotationCardMemo";

export function SpanAnnotationCard({
  isSelected,
  annotation,
  code,
  onClick,
  cardProps,
}: AnnotationCardProps<SpanAnnotationRead>) {
  return (
    <Card {...cardProps}>
      <CardHeader
        title={<CodeRenderer key={annotation.code_id} code={annotation.code_id} />}
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
              borderColor: code.color,
              pl: 1,
            }}
          >
            {annotation.text}
          </Typography>
          <Stack direction="row" justifyContent="end" width="100%">
            <Typography variant="subtitle2" color="textDisabled" fontSize={12}>
              <UserRenderer user={annotation.user_id} />
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
            codeName={code.name}
            annotationText={annotation.text}
          />
        </>
      )}
    </Card>
  );
}
