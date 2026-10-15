import { bboxAnnotationQueries } from "@core/bbox-annotation";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { useQuery } from "@tanstack/react-query";
import { AnnotationRouteAPI } from "../../_hooks/annotationRouteAPI";
import { AnnotationExplorer } from "./_components/AnnotationExplorer";
import { BBoxAnnotationCard } from "./_components/BBoxAnnotationCard";

const filterByText = (text: string) => (annotation: BBoxAnnotationRead) => `${annotation.x_max}`.includes(text);

const estimateSize = () => 190;

export function BBoxAnnotationExplorer({ sdocId }: { sdocId: number }) {
  // data
  const { visibleUserId } = AnnotationRouteAPI.useSearch();
  const annotations = useQuery(bboxAnnotationQueries.bySdoc(sdocId, visibleUserId));

  return (
    <AnnotationExplorer
      annotations={annotations.data}
      filterByText={filterByText}
      renderAnnotationCard={(props) => <BBoxAnnotationCard {...props} />}
      estimateSize={estimateSize}
    />
  );
}
