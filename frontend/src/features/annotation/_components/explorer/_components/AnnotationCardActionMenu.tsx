import { MemoHooks } from "@api/hooks/MemoHooks";
import { AttachedObjectType } from "@api/models/AttachedObjectType";
import { Icon, getIconComponent } from "@components/icons";
import { MemoDeleteMenuItem } from "@core/memo";
import { IconButton, IconButtonProps, Menu } from "@mui/material";
import { useState } from "react";
import { BBoxAnnotationDeleteMenuItem } from "./BBoxAnnotationDeleteMenuItem";
import { SentenceAnnotationDeleteMenuItem } from "./SentenceAnnotationDeleteMenuItem";
import { SpanAnnotationDeleteMenuItem } from "./SpanAnnotationDeleteMenuItem";

interface MemoMenuItemsProps {
  annotationId: number;
  annotationType:
    | AttachedObjectType.SPAN_ANNOTATION
    | AttachedObjectType.BBOX_ANNOTATION
    | AttachedObjectType.SENTENCE_ANNOTATION;
  handleClose: () => void;
}

function MemoMenuItems({ annotationId, annotationType, handleClose }: MemoMenuItemsProps) {
  const memo = MemoHooks.useGetUserMemo(annotationType, annotationId);

  if (memo.isSuccess) {
    return <MemoDeleteMenuItem memoId={memo.data.id} memoTitle={memo.data.title} onClick={handleClose} />;
  }
  return null;
}

interface AnnotationCardActionsMenuProps {
  annotationId: number;
  annotationType:
    | AttachedObjectType.SPAN_ANNOTATION
    | AttachedObjectType.BBOX_ANNOTATION
    | AttachedObjectType.SENTENCE_ANNOTATION;
  iconButtonProps?: Omit<IconButtonProps, "onClick">;
}

export function AnnotationCardActionsMenu({
  annotationId,
  annotationType,
  iconButtonProps,
}: AnnotationCardActionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton onClick={handleClick} {...iconButtonProps}>
        {getIconComponent(Icon.CONTEXT_MENU)}
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MemoMenuItems annotationId={annotationId} annotationType={annotationType} handleClose={handleClose} />
        {annotationType === AttachedObjectType.SPAN_ANNOTATION ? (
          <SpanAnnotationDeleteMenuItem annotationId={annotationId} onClick={handleClose} />
        ) : annotationType === AttachedObjectType.SENTENCE_ANNOTATION ? (
          <SentenceAnnotationDeleteMenuItem annotationId={annotationId} onClick={handleClose} />
        ) : (
          <BBoxAnnotationDeleteMenuItem annotationId={annotationId} onClick={handleClose} />
        )}
      </Menu>
    </>
  );
}
