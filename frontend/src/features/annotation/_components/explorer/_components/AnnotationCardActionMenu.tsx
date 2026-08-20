import { Icon, getIconComponent } from "@components/icons";
import { MemoMenuItem } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { IconButton, IconButtonProps, Menu } from "@mui/material";
import { useState } from "react";
import { BBoxAnnotationDeleteMenuItem } from "./BBoxAnnotationDeleteMenuItem";
import { SentenceAnnotationDeleteMenuItem } from "./SentenceAnnotationDeleteMenuItem";
import { SpanAnnotationDeleteMenuItem } from "./SpanAnnotationDeleteMenuItem";

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
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const handleClose = (event?: { stopPropagation?: () => void; preventDefault?: () => void }) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton onClick={handleClick} {...iconButtonProps}>
        {getIconComponent(Icon.CONTEXT_MENU)}
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MemoMenuItem attachedObjectId={annotationId} attachedObjectType={annotationType} onClick={handleClose} />
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
