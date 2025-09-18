import { Link } from "react-router-dom";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead.ts";
import { SpanAnnotationRow } from "../../../api/openapi/models/SpanAnnotationRow.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { AnnoActions } from "../../../views/annotation/annoSlice.ts";

interface SdocAnnotationLinkProps {
  sdoc: SourceDocumentRead;
  annotation: SpanAnnotationRow;
}

function SdocAnnotationLink({ sdoc, annotation }: SdocAnnotationLinkProps) {
  const dispatch = useAppDispatch();
  const handleClick = () => {
    dispatch(AnnoActions.setSelectedAnnotationId(annotation.id));
    dispatch(AnnoActions.setVisibleUserId(annotation.user_id));
  };

  return (
    <Link to={`/project/${sdoc.project_id}/annotation/${sdoc.id}`} onClick={handleClick}>
      {sdoc.name}
    </Link>
  );
}

export default SdocAnnotationLink;
