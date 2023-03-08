import { Stack } from "@mui/material";
import React, { useState } from "react";
import MemoCard from "./MemoCard";
import { ContextMenuPosition } from "../projects/ProjectContextMenu2";
import MemoResultsContextMenu from "./MemoResultsContextMenu";
import { AttachedObjectType } from "../../api/openapi";

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
      <Stack spacing={2}>
        {memoIds.map((memoId) => (
          <MemoCard key={memoId} memoId={memoId} onContextMenu={onContextMenu} />
        ))}
        {memoIds.length === 0 && <div>{noResultsText}</div>}
      </Stack>
      <MemoResultsContextMenu
        memoId={contextMenuData.memoId}
        memoStarred={contextMenuData.memoStarred}
        attachedObjectType={contextMenuData.attachedObjectType!}
        position={contextMenuPosition}
        handleClose={() => setContextMenuPosition(null)}
      />
    </>
  );
}

export default MemoResults;
