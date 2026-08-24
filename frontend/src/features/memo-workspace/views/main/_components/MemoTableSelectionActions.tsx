import { MemoHooks } from "@api/hooks/MemoHooks";
import { MemoDeleteButton } from "@core/memo";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { IconButton, Tooltip } from "@mui/material";
import { ReactNode, useCallback } from "react";

interface MemoTableSelectionActionsProps {
  selectedIds: number[];
  clearSelection: () => void;
}

/** Bulk actions for selected memos in the TABLE layout: favorite, unfavorite, and delete. */
export function MemoTableSelectionActions({ selectedIds, clearSelection }: MemoTableSelectionActionsProps): ReactNode {
  const { mutate: favoriteMemos, isPending: isFavoriting } = MemoHooks.useFavoriteMemos();

  const handleFavorite = useCallback(
    (isFavorite: boolean) => {
      favoriteMemos({ memoIds: selectedIds, isFavorite }, { onSuccess: clearSelection });
    },
    [favoriteMemos, selectedIds, clearSelection],
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
