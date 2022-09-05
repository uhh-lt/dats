import { AnnotationDocumentRead } from "../../../api/openapi";
import { useCallback, useEffect, useState } from "react";
import SdocHooks from "../../../api/SdocHooks";

export function useSelectableAnnotationDocuments(sdocId: number | undefined) {
  // state
  const [selectedAdoc, setSelectedAdoc] = useState<AnnotationDocumentRead | null>(null);

  // queries
  const annotationDocuments = SdocHooks.useGetAllAnnotationDocuments(sdocId);

  // automatically select first annotation document once it is loaded
  useEffect(() => {
    if (annotationDocuments.data) {
      setSelectedAdoc(annotationDocuments.data[0]);
    } else {
      setSelectedAdoc(null);
    }
  }, [annotationDocuments.data]);

  // actions
  const handleSelectAnnotationDocument = useCallback((adoc: AnnotationDocumentRead) => {
    setSelectedAdoc(adoc);
  }, []);

  return {
    annotationDocuments,
    selectedAdoc: selectedAdoc?.source_document_id === sdocId ? selectedAdoc : null,
    handleSelectAnnotationDocument,
  };
}
