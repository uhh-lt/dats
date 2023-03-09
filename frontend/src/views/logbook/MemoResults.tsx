import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useRef, useState } from "react";
import { AttachedObjectType } from "../../api/openapi";
import { ContextMenuPosition } from "../projects/ProjectContextMenu2";
import MemoCard from "./MemoCard";
import MemoResultsContextMenu from "./MemoResultsContextMenu";

interface MemoResultsProps {
  memoIds: number[];
  noResultsText: string;
}

export interface MemoCardContextMenuData {
  memoId: number | undefined;
  memoStarred: boolean | undefined;
  attachedObjectType: AttachedObjectType | undefined;
}

function MemoResults({ noResultsText, memoIds }: MemoResultsProps) {
  // virtualized results
  const containerRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: memoIds.length || 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 170,
  });

  // context menu
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [contextMenuData, setContextMenuData] = useState<MemoCardContextMenuData>({
    memoId: undefined,
    attachedObjectType: undefined,
    memoStarred: undefined,
  });
  const onContextMenu = (data: MemoCardContextMenuData) => (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuData(data);
  };

  return (
    <div ref={containerRef} className="h100" style={{ overflowY: "auto" }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => (
          <MemoCard
            key={virtualItem.key}
            // @ts-ignore
            ref={(element) => rowVirtualizer.measureElement(element)}
            data-index={virtualItem.index}
            style={{
              padding: 5,
              position: "absolute",
              top: 0,
              left: 0,
              transform: `translateY(${virtualItem.start}px)`,
            }}
            memoId={memoIds[virtualItem.index]}
            onContextMenu={onContextMenu}
          />
        ))}
        {memoIds.length === 0 && <div>{noResultsText}</div>}
      </div>
      <MemoResultsContextMenu
        memoId={contextMenuData.memoId}
        memoStarred={contextMenuData.memoStarred}
        attachedObjectType={contextMenuData.attachedObjectType!}
        position={contextMenuPosition}
        handleClose={() => setContextMenuPosition(null)}
      />
    </div>
  );
}

export default MemoResults;
