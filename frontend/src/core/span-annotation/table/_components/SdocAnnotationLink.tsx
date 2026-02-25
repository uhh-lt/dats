import { useAppDispatch } from "@plugins/redux";
import { Link } from "@tanstack/react-router";
import { SourceDocumentRead } from "../../../../api/openapi/models/SourceDocumentRead";
import { SpanAnnotationRow } from "../../../../api/openapi/models/SpanAnnotationRow";
import { AnnoActions } from "../../../../features/annotation/store/annoSlice";

interface SdocAnnotationLinkProps {
  sdoc: SourceDocumentRead;
  annotation: SpanAnnotationRow;
}

export function SdocAnnotationLink({ sdoc, annotation }: SdocAnnotationLinkProps) {
  const dispatch = useAppDispatch();
  const handleClick = () => {
    dispatch(AnnoActions.setSelectedAnnotationId(annotation.id));
    dispatch(AnnoActions.setVisibleUserId(annotation.user_id));
  };

  return (
    <Link
      to="/project/$projectId/annotation/$sdocId"
      params={{ projectId: sdoc.project_id, sdocId: sdoc.id }}
      onClick={handleClick}
    >
      {sdoc.name}
    </Link>
  );
}
