import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, Menu } from "@mui/material";
import { useState } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import MemoMenuItem from "../../../features/Memo/MemoMenuItem.tsx";
import BBoxAnnotationDeleteMenuItem from "./BBoxAnnotationDeleteMenuItem.tsx";
import SpanAnnotationDeleteMenuItem from "./SpanAnnotationDeleteMenuItem.tsx";

interface AnnotationCardActionsMenuProps {
  annotationId: number;
  annotationType: AttachedObjectType.SPAN_ANNOTATION | AttachedObjectType.BBOX_ANNOTATION;
}

export default function AnnotationCardActionsMenu({ annotationId, annotationType }: AnnotationCardActionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      <IconButton
        id="icon-button"
        aria-controls={open ? "menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <MemoMenuItem attachedObjectId={annotationId} attachedObjectType={annotationType} onClick={handleClose} />
        {annotationType === AttachedObjectType.SPAN_ANNOTATION ? (
          <SpanAnnotationDeleteMenuItem annotationId={annotationId} onClick={handleClose} />
        ) : (
          <BBoxAnnotationDeleteMenuItem annotationId={annotationId} onClick={handleClose} />
        )}
      </Menu>
    </div>
  );
}
