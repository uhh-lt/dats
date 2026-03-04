import { BboxAnnotationHooks } from "@api/hooks/BboxAnnotationHooks";
import { BBoxAnnotationRead } from "@api/models/BBoxAnnotationRead";
import { useAppSelector } from "@plugins/redux";
import { AnnotationExplorer } from "./_components/AnnotationExplorer";
import { BBoxAnnotationCard } from "./_components/BBoxAnnotationCard";

const filterByText = (text: string) => (annotation: BBoxAnnotationRead) => `${annotation.x_max}`.includes(text);

const estimateSize = () => 190;

export function BBoxAnnotationExplorer({ sdocId }: { sdocId: number }) {
  // data
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const annotations = BboxAnnotationHooks.useGetBBoxAnnotationsBatch(sdocId, visibleUserId);

  return (
    <AnnotationExplorer
      annotations={annotations.data}
      filterByText={filterByText}
      renderAnnotationCard={(props) => <BBoxAnnotationCard {...props} />}
      estimateSize={estimateSize}
    />
  );
}
