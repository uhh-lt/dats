import { Box } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ReactNode, useCallback, useLayoutEffect, useRef, useState } from "react";
import { LayoutProps } from "./LayoutProps";

const MIN_CARD_WIDTH = 320;
const GAP = 16;
const PADDING = 16;

/** GALLERY layout shell: a virtualized responsive grid of cards. */
export function GalleryLayout<TColumns extends string, TRow extends { id: number }>({
  config,
  rows,
  onSelect,
  selectedProperties,
  virtualize = true,
}: LayoutProps<TColumns, TRow>): ReactNode {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // The scroll element is the nearest scrollable ancestor (the result list's overflow container).
  const getScrollElement = useCallback((): HTMLElement | null => {
    let el = parentRef.current?.parentElement ?? null;
    while (el) {
      const overflowY = getComputedStyle(el).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") return el;
      el = el.parentElement;
    }
    return null;
  }, []);

  // Track the container width to derive the number of grid lanes (matches the old
  // `repeat(auto-fill, minmax(320px, 1fr))` behavior).
  useLayoutEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width !== undefined) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const lanes = Math.max(1, Math.floor((containerWidth + GAP) / (MIN_CARD_WIDTH + GAP)));
  const rowCount = Math.ceil(rows.length / lanes);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement,
    estimateSize: useCallback(() => 320, []),
    overscan: 4,
    gap: GAP,
    paddingStart: PADDING,
    paddingEnd: PADDING,
  });

  const renderCard = useCallback(
    (row: TRow) => config.renderCard(row, onSelect, selectedProperties),
    [config, onSelect, selectedProperties],
  );

  if (!virtualize)
    return (
      <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(320px, 1fr))" gap={2} p={2}>
        {rows.map(renderCard)}
      </Box>
    );

  return (
    <div ref={parentRef} style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const startIndex = virtualRow.index * lanes;
        const rowItems = rows.slice(startIndex, startIndex + lanes);
        return (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            style={{
              width: "100%",
              position: "absolute",
              top: 0,
              left: 0,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <Box display="grid" gridTemplateColumns={`repeat(${lanes}, 1fr)`} gap={2} px={2}>
              {rowItems.map((row) => renderCard(row))}
            </Box>
          </div>
        );
      })}
    </div>
  );
}
