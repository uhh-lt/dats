import { MemoHooks } from "@api/hooks/MemoHooks";
import { getIconComponent, Icon } from "@components/icons";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { memo, useCallback } from "react";

interface MemoFavoriteButtonProps {
  memoIds: number[];
  isFavorite: boolean;
}

export const MemoFavoriteButton = memo(
  ({ memoIds, isFavorite, ...props }: MemoFavoriteButtonProps & IconButtonProps) => {
    const { mutate: updateMemos, isPending } = MemoHooks.useUpdateMemos();

    const handleClick = useCallback(() => {
      updateMemos({
        requestBody: memoIds.map((memoId) => ({ memo_id: memoId, is_favorite: !isFavorite })),
      });
    }, [memoIds, isFavorite, updateMemos]);

    return (
      <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"}>
        <span>
          <IconButton onClick={handleClick} disabled={isPending} {...props}>
            {getIconComponent(isFavorite ? Icon.FAVORITE : Icon.FAVORITE_BORDER)}
          </IconButton>
        </span>
      </Tooltip>
    );
  },
);
