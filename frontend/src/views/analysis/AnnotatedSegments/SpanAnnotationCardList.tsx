import { Grid2, Typography } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import SpanAnnotationCard from "./SpanAnnotationCard.tsx";

interface SpanAnnotationCardListProps {
  spanAnnotationIds: number[];
}

function SpanAnnotationCardList({ spanAnnotationIds }: SpanAnnotationCardListProps) {
  const listRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);

  // The virtualizer
  const virtualizer = useVirtualizer({
    count: spanAnnotationIds.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 200,
  });

  return (
    <Grid2 size={{ md: 6 }} ref={listRef} className="h100WithScroll">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {spanAnnotationIds.length > 0 ? (
          virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              style={{
                width: "100%",
                position: "absolute",
                top: 0,
                left: 0,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <SpanAnnotationCard annotationId={spanAnnotationIds[virtualItem.index]} sx={{ mb: 1 }} />
            </div>
          ))
        ) : (
          <Typography variant="body1" component="div">
            No segment selected. Click on a row to view a segment.
          </Typography>
        )}
      </div>
    </Grid2>
  );
}

export default SpanAnnotationCardList;
