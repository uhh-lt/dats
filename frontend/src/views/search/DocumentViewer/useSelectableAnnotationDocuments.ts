import { useCallback, useEffect, useState } from "react";
import SdocHooks from "../../../api/SdocHooks.ts";
import { AnnotationDocumentRead } from "../../../api/openapi/models/AnnotationDocumentRead.ts";

export function useSelectableAnnotationDocuments(sdocId: number | undefined) {
  // state
  const [selectedAdoc, setSelectedAdoc] = useState<AnnotationDocumentRead | undefined>(undefined);

  // queries
  const annotationDocuments = SdocHooks.useGetAllAnnotationDocuments(sdocId);

  // automatically select first annotation document once it is loaded
  useEffect(() => {
    if (annotationDocuments.data) {
      setSelectedAdoc(annotationDocuments.data[0]);
    } else {
      setSelectedAdoc(undefined);
    }
  }, [annotationDocuments.data]);

  // actions
  const handleSelectAnnotationDocument = useCallback((adoc: AnnotationDocumentRead) => {
    setSelectedAdoc(adoc);
  }, []);

  return {
    annotationDocuments,
    selectedAdoc: selectedAdoc?.source_document_id === sdocId ? selectedAdoc : undefined,
    handleSelectAnnotationDocument,
  };
}
