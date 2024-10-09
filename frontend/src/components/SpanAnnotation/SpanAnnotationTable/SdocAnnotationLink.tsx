import { Link } from "react-router-dom";
import { AnnotationTableRow } from "../../../api/openapi/models/AnnotationTableRow.ts";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { AnnoActions } from "../../../views/annotation/annoSlice.ts";

interface SdocAnnotationLinkProps {
  sdoc: SourceDocumentRead;
  annotation: AnnotationTableRow;
}

function SdocAnnotationLink({ sdoc, annotation }: SdocAnnotationLinkProps) {
  const dispatch = useAppDispatch();
  const handleClick = () => {
    dispatch(AnnoActions.setSelectedAnnotationId(annotation.id));
    dispatch(AnnoActions.addVisibleUserIds([annotation.user_id]));
  };

  return (
    <Link to={`/project/${sdoc.project_id}/annotation/${sdoc.id}`} onClick={handleClick}>
      {sdoc.filename}
    </Link>
  );
}

export default SdocAnnotationLink;
