import ArticleIcon from "@mui/icons-material/Article";
import LabelIcon from "@mui/icons-material/Label";
import SquareIcon from "@mui/icons-material/Square";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";

export const attachedObjectTypeToIcon: Record<AttachedObjectType, React.ReactElement> = {
  [AttachedObjectType.PROJECT]: <></>,
  [AttachedObjectType.SOURCE_DOCUMENT]: <ArticleIcon />,
  [AttachedObjectType.DOCUMENT_TAG]: <LabelIcon />,
  [AttachedObjectType.CODE]: <SquareIcon />,
  [AttachedObjectType.SPAN_ANNOTATION]: <ArticleIcon />,
  [AttachedObjectType.BBOX_ANNOTATION]: <ArticleIcon />,
  [AttachedObjectType.ANNOTATION_DOCUMENT]: <></>,
  [AttachedObjectType.SPAN_GROUP]: <></>,
};
