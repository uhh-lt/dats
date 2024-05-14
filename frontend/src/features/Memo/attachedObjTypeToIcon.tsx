import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CodeIcon from "@mui/icons-material/Code";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import RateReviewIcon from "@mui/icons-material/RateReview";
import SourceIcon from "@mui/icons-material/Source";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import * as React from "react";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";

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
