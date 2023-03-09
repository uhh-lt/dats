import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useRef, useState } from "react";
import { AttachedObjectType } from "../../api/openapi";
import { ContextMenuPosition } from "../../components/ContextMenu/ContextMenuPosition";
import MemoCard from "./MemoCard";
import MemoResultsContextMenu from "./MemoResultsContextMenu";
import { CardContent, List } from "@mui/material";

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
    <>
      <MemoResultsContextMenu
        memoId={contextMenuData.memoId}
        memoStarred={contextMenuData.memoStarred}
        attachedObjectType={contextMenuData.attachedObjectType!}
        position={contextMenuPosition}
        handleClose={() => setContextMenuPosition(null)}
      />
      <CardContent ref={containerRef} style={{ height: "100%", padding: 0, overflowY: "auto" }}>
        <List
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
              dataIndex={virtualItem.index}
              style={{
                width: "100%",
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
        </List>
      </CardContent>
    </>
  );
}

export default MemoResults;
