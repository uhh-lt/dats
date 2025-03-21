import { useCallback } from "react";
import { Link } from "react-router-dom";
import { SentenceAnnotationRow } from "../../../api/openapi/models/SentenceAnnotationRow.ts";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { AnnoActions } from "../../../views/annotation/annoSlice.ts";

interface SdocAnnotationLinkProps {
  sdoc: SourceDocumentRead;
  annotation: SentenceAnnotationRow;
}

function SdocAnnotationLink({ sdoc, annotation }: SdocAnnotationLinkProps) {
  const dispatch = useAppDispatch();

  const handleClick = useCallback(() => {
    dispatch(AnnoActions.setSelectedAnnotationId(annotation.id));
    dispatch(AnnoActions.setVisibleUserId(annotation.user_id));
  }, [dispatch, annotation.id, annotation.user_id]);

  return (
    <Link to={`/project/${sdoc.project_id}/annotation/${sdoc.id}`} onClick={handleClick}>
      {sdoc.filename}
    </Link>
  );
}

export default SdocAnnotationLink;
