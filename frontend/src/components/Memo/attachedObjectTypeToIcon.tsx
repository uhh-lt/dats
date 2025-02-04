import ArticleIcon from "@mui/icons-material/Article";
import LabelIcon from "@mui/icons-material/Label";
import NotesIcon from "@mui/icons-material/Notes";
import SquareIcon from "@mui/icons-material/Square";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";

export const attachedObjectTypeToIcon: Record<AttachedObjectType, React.ReactElement> = {
  [AttachedObjectType.PROJECT]: <></>,
  [AttachedObjectType.SOURCE_DOCUMENT]: <ArticleIcon />,
  [AttachedObjectType.DOCUMENT_TAG]: <LabelIcon />,
  [AttachedObjectType.CODE]: <SquareIcon />,
  [AttachedObjectType.SPAN_ANNOTATION]: <NotesIcon />,
  [AttachedObjectType.BBOX_ANNOTATION]: <ArticleIcon />,
  [AttachedObjectType.SPAN_GROUP]: <></>,
  [AttachedObjectType.SENTENCE_ANNOTATION]: <NotesIcon />,
};
