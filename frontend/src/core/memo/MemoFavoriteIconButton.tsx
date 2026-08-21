import { MemoHooks } from "@api/hooks/MemoHooks";
import { getIconComponent, Icon } from "@components/icons";
import { MemoRow } from "@models/MemoRow";
import { IconButton } from "@mui/material";
import { memo, useCallback } from "react";

interface MemoFavoriteIconButtonProps {
  memo: MemoRow;
}

/**
 * Favorite toggle for a memo row. Stops propagation so the
 * surrounding clickable row/card does not also trigger selection.
 */
export const MemoFavoriteIconButton = memo(({ memo }: MemoFavoriteIconButtonProps) => {
  const favorite = MemoHooks.useFavoriteMemos();

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      favorite.mutate({ memoIds: [memo.id], isFavorite: !memo.is_favorite });
    },
    [favorite, memo.id, memo.is_favorite],
  );

  return (
    <IconButton size="small" onClick={handleClick}>
      {memo.is_favorite
        ? getIconComponent(Icon.FAVORITE, { color: "warning" })
        : getIconComponent(Icon.FAVORITE_BORDER)}
    </IconButton>
  );
});
