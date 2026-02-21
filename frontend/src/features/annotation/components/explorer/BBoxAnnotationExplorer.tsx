import { BboxAnnotationHooks } from "../../../../api/BboxAnnotationHooks.ts";
import { BBoxAnnotationRead } from "../../../../api/openapi/models/BBoxAnnotationRead.ts";
import { useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { AnnotationExplorer } from "./components/AnnotationExplorer.tsx";
import { BBoxAnnotationCard } from "./components/BBoxAnnotationCard.tsx";

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
