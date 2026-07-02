import { SentenceAnnotationRow } from "@models/SentenceAnnotationRow";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import { Link } from "@tanstack/react-router";

interface SdocAnnotationLinkProps {
  sdoc: SourceDocumentRead;
  annotation: SentenceAnnotationRow;
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
