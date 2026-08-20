import { MemoHooks } from "@api/hooks/MemoHooks";
import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { memo, useCallback } from "react";

interface MemoStarButtonProps {
  memoIds: number[];
  isStarred: boolean;
}

export const MemoStarButton = memo(({ memoIds, isStarred, ...props }: MemoStarButtonProps & IconButtonProps) => {
  const { mutate: favoriteMemos, isPending } = MemoHooks.useFavoriteMemos();

  const handleClick = useCallback(() => {
    favoriteMemos({
      memoIds,
      isFavorite: !isStarred,
    });
  }, [memoIds, isStarred, favoriteMemos]);

  return (
    <Tooltip title={isStarred ? "Remove from favorites" : "Add to favorites"}>
      <span>
        <IconButton onClick={handleClick} disabled={isPending} {...props}>
          {isStarred ? <StarIcon /> : <StarOutlineIcon />}
        </IconButton>
      </span>
    </Tooltip>
  );
});
