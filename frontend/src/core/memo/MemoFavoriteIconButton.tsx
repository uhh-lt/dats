import { MemoHooks } from "@api/hooks/MemoHooks";
import { getIconComponent, Icon } from "@components/icons";
import { MemoRead } from "@models/MemoRead";
import { IconButton } from "@mui/material";
import { memo, useCallback } from "react";

interface MemoFavoriteIconButtonProps {
  memo: MemoRead;
}

/**
 * Favorite toggle for a memo row. Stops propagation so the
 * surrounding clickable row/card does not also trigger selection.
 */
export const MemoFavoriteIconButton = memo(({ memo }: MemoFavoriteIconButtonProps) => {
  const { mutate: updateMemos } = MemoHooks.useUpdateMemos();

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      updateMemos({ requestBody: [{ memo_id: memo.id, is_favorite: !memo.is_favorite }] });
    },
    [updateMemos, memo.id, memo.is_favorite],
  );

  return (
    <IconButton size="small" onClick={handleClick}>
      {memo.is_favorite
        ? getIconComponent(Icon.FAVORITE, { color: "warning" })
        : getIconComponent(Icon.FAVORITE_BORDER)}
    </IconButton>
  );
});
