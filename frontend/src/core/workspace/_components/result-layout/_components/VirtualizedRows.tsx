import { useVirtualizer } from "@tanstack/react-virtual";
import { ReactNode, useCallback, useRef } from "react";

interface VirtualizedRowsProps<TRow extends { id: number }> {
  rows: TRow[];
  /** Renders a single row. */
  renderRow: (row: TRow) => ReactNode;
  /** Estimated row height in px (used before measurement). */
  estimateSize: number;
  /** Vertical gap between rows in px (matches the layout's spacing). Defaults to 0. */
  gap?: number;
  /** Padding around the whole list in px (matches the layout's padding). Defaults to 0. */
  padding?: number;
}

/**
 * Virtualizes a vertical list of rows using @tanstack/react-virtual. The virtualizer scrolls
 * against the nearest scrollable ancestor (the result list's `overflow: auto` container), so the
 * shell must be rendered inside that container. Row heights are measured dynamically via
 * `measureElement`, so variable-height rows are supported.
 */
export function VirtualizedRows<TRow extends { id: number }>({
  rows,
  renderRow,
  estimateSize,
  gap = 0,
  padding = 0,
}: VirtualizedRowsProps<TRow>): ReactNode {
  const parentRef = useRef<HTMLDivElement | null>(null);

  // The scroll element is the nearest scrollable ancestor; the spacer div's parent is the
  // layout shell, whose parent is the scrollable result-list container.
  const getScrollElement = useCallback((): HTMLElement | null => {
    let el = parentRef.current?.parentElement ?? null;
    while (el) {
      const overflowY = getComputedStyle(el).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") return el;
      el = el.parentElement;
    }
    return null;
  }, []);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement,
    estimateSize: useCallback(() => estimateSize, [estimateSize]),
    overscan: 4,
    gap,
    paddingStart: padding,
    paddingEnd: padding,
  });

  return (
    <div ref={parentRef} style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const row = rows[virtualItem.index];
        return (
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
            {renderRow(row)}
          </div>
        );
      })}
    </div>
  );
}
