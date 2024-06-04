import { Box, List } from "@mui/material";
import { BoxProps } from "@mui/system";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import MemoCard from "../../components/Memo/MemoCard/MemoCard.tsx";

interface MemoResultsProps {
  memoIds: number[];
  noResultsText: string;
}

function MemoResults({ noResultsText, memoIds, ...props }: MemoResultsProps & BoxProps) {
  // virtualized results
  const containerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: memoIds.length || 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 170,
  });

  return (
    <>
      <Box ref={containerRef} style={{ height: "90%", overflowY: "auto" }} {...props}>
        <List
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => (
            <Box
              key={virtualItem.key}
              ref={(element: HTMLDivElement) => rowVirtualizer.measureElement(element)}
              component="div"
              data-index={virtualItem.index}
              style={{
                paddingBottom: "8px",
                width: "100%",
                position: "absolute",
                top: 0,
                left: 0,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <MemoCard memo={memoIds[virtualItem.index]} />
            </Box>
          ))}
          {memoIds.length === 0 && <div>{noResultsText}</div>}
        </List>
      </Box>
    </>
  );
}

export default MemoResults;
