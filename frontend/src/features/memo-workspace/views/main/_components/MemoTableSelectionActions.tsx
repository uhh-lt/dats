import { MemoDeleteButton, MemoHooks } from "@core/memo";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { IconButton, Tooltip } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { ReactNode, useCallback } from "react";

interface MemoTableSelectionActionsProps {
  selectedIds: number[];
  clearSelection: () => void;
}

/** Bulk actions for selected memos in the TABLE layout: favorite, unfavorite, and delete. */
export function MemoTableSelectionActions({ selectedIds, clearSelection }: MemoTableSelectionActionsProps): ReactNode {
  const projectId = useParams({ strict: false, select: (params) => params.projectId });
  const { mutate: updateMemos, isPending: isFavoriting } = MemoHooks.useUpdateMemos();

  const handleFavorite = useCallback(
    (isFavorite: boolean) => {
      if (projectId === undefined) return;
      updateMemos(
        { projectId, requestBody: selectedIds.map((memoId) => ({ memo_id: memoId, is_favorite: isFavorite })) },
        { onSuccess: clearSelection },
      );
    },
    [updateMemos, projectId, selectedIds, clearSelection],
  );

  return (
    <>
      <Tooltip title="Favorite">
        <span>
          <IconButton size="small" disabled={isFavoriting} onClick={() => handleFavorite(true)}>
            <StarIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Unfavorite">
        <span>
          <IconButton size="small" disabled={isFavoriting} onClick={() => handleFavorite(false)}>
            <StarBorderIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <MemoDeleteButton memoIds={selectedIds} size="small" />
    </>
  );
}
