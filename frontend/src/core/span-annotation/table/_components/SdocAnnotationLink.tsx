import { SourceDocumentRead } from "@api/models/SourceDocumentRead";
import { SpanAnnotationRow } from "@api/models/SpanAnnotationRow";
import { Link } from "@tanstack/react-router";

interface SdocAnnotationLinkProps {
  sdoc: SourceDocumentRead;
  annotation: SpanAnnotationRow;
}

export function SdocAnnotationLink({ sdoc, annotation }: SdocAnnotationLinkProps) {
  return (
    <Link
      to="/project/$projectId/annotation/$sdocId"
      params={{ projectId: sdoc.project_id, sdocId: sdoc.id }}
      search={{ visibleUserId: annotation.user_id, selectedAnnotationId: annotation.id }}
    >
      {sdoc.name}
    </Link>
  );
}
