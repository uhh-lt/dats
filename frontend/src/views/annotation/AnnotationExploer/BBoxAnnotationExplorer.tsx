import { useMemo } from "react";
import AdocHooks from "../../../api/AdocHooks.ts";
import { BBoxAnnotationReadResolvedCode } from "../../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotationExplorer from "./AnnotationExplorer.tsx";
import BBoxAnnotationCard from "./BBoxAnnotationCard.tsx";

const filterByText = (text: string) => (annotation: BBoxAnnotationReadResolvedCode) =>
  annotation.code.name.includes(text);

const estimateSize = () => 190;

function BBoxAnnotationExplorer() {
  // data
  const visibleAdocIds = useAppSelector((state) => state.annotations.visibleAdocIds);
  const annotationsBatch = AdocHooks.useGetAllBboxAnnotationsBatch(visibleAdocIds);
  const annotations = useMemo(() => {
    const annotationsIsUndefined = annotationsBatch.some((a) => !a.data);
    if (annotationsIsUndefined) return undefined;
    return annotationsBatch.map((a) => a.data!).flat();
  }, [annotationsBatch]);

  return (
    <AnnotationExplorer
      annotations={annotations}
      filterByText={filterByText}
      renderAnnotationCard={(props) => <BBoxAnnotationCard {...props} />}
      estimateSize={estimateSize}
    />
  );
}

export default BBoxAnnotationExplorer;
