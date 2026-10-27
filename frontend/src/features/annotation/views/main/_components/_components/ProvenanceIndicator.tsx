import { AnnotationProvenance, AnnotationProvenanceBadge } from "@core/annotation";
import { useAppSelector } from "@store/storeHooks";

interface ProvenanceIndicatorProps {
  annotation: AnnotationProvenance;
}

/**
 * The provenance badge of an annotation in the annotator, shown unless the user switched it off in the toolbar.
 */
export function ProvenanceIndicator({ annotation }: ProvenanceIndicatorProps) {
  const showProvenance = useAppSelector((state) => state.annotations.showProvenance);
  if (!showProvenance) {
    return null;
  }
  return <AnnotationProvenanceBadge annotation={annotation} />;
}
