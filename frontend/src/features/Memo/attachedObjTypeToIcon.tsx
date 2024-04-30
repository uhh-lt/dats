import * as React from "react";
import { AttachedObjectType } from "../../api/openapi";
import RateReviewIcon from "@mui/icons-material/RateReview";
import CodeIcon from "@mui/icons-material/Code";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SourceIcon from "@mui/icons-material/Source";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import NoteAltIcon from "@mui/icons-material/NoteAlt";

export const attachedObjTypeToIcon: Record<AttachedObjectType, React.ReactElement> = {
  [AttachedObjectType.ANNOTATION_DOCUMENT]: <RateReviewIcon />,
  [AttachedObjectType.BBOX_ANNOTATION]: <CheckBoxOutlineBlankIcon />,
  [AttachedObjectType.CODE]: <CodeIcon />,
  [AttachedObjectType.DOCUMENT_TAG]: <LocalOfferIcon />,
  [AttachedObjectType.PROJECT]: <AccountTreeIcon />,
  [AttachedObjectType.SOURCE_DOCUMENT]: <SourceIcon />,
  [AttachedObjectType.SPAN_ANNOTATION]: <NoteAltIcon />,
  [AttachedObjectType.SPAN_GROUP]: <WorkspacesIcon />,
};
