import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import SdocHooks from "../../../api/SdocHooks.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotationExplorer from "./AnnotationExplorer.tsx";
import SpanAnnotationCard from "./SpanAnnotationCard.tsx";

const filterByText = (text: string) => (annotation: SpanAnnotationReadResolved) => annotation.text.includes(text);

function SpanAnnotationExplorer({ sdocId }: { sdocId: number }) {
  // data
  const visibleUserIds = useAppSelector((state) => state.annotations.visibleUserIds);
  const annotations = SdocHooks.useGetSpanAnnotationsBatch(sdocId, visibleUserIds);

  return (
    <AnnotationExplorer
      annotations={annotations.data}
      filterByText={filterByText}
      renderAnnotationCard={SpanAnnotationCard}
    />
  );
}

export default SpanAnnotationExplorer;
