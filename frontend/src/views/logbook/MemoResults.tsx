import { Box, List } from "@mui/material";
import { BoxProps } from "@mui/system";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useRef, useState } from "react";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import { ContextMenuPosition } from "../../components/ContextMenu/ContextMenuPosition.ts";
import MemoCard from "../../components/Memo/MemoCard/MemoCard.tsx";
import MemoResultsContextMenu from "./MemoResultsContextMenu.tsx";

interface MemoResultsProps {
  memoIds: number[];
  noResultsText: string;
}

export interface MemoCardContextMenuData {
  memoId: number | undefined;
  memoStarred: boolean | undefined;
  attachedObjectType: AttachedObjectType | undefined;
}

function MemoResults({ noResultsText, memoIds, ...props }: MemoResultsProps & BoxProps) {
  // virtualized results
  const containerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: memoIds.length || 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 170,
  });

  // context menu
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [contextMenuData, setContextMenuData] = useState<MemoRead | undefined>(undefined);
  const onContextMenu = (memo: MemoRead) => (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuData(memo);
  };

  return (
    <>
      <MemoResultsContextMenu
        memoId={contextMenuData?.id}
        memoStarred={contextMenuData?.starred}
        attachedObjectType={contextMenuData?.attached_object_type || AttachedObjectType.SPAN_GROUP}
        position={contextMenuPosition}
        handleClose={() => setContextMenuPosition(null)}
      />
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
              <MemoCard memo={memoIds[virtualItem.index]} onContextMenu={onContextMenu} />
            </Box>
          ))}
          {memoIds.length === 0 && <div>{noResultsText}</div>}
        </List>
      </Box>
    </>
  );
}

export default MemoResults;
