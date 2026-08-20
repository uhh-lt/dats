import { MemoHooks } from "@api/hooks/MemoHooks";
import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo, useCallback } from "react";

interface MemoStarButtonProps {
  memoId: number | undefined;
  isStarred: boolean | undefined;
  onClick?: () => void;
}

export const MemoStarMenuItem = memo(
  ({ memoId, isStarred, onClick, ...props }: MemoStarButtonProps & MenuItemProps) => {
    const { mutate: favoriteMemos, isPending } = MemoHooks.useFavoriteMemos();

    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        if (memoId === undefined || isStarred === undefined) return;
        event.stopPropagation();
        favoriteMemos({ memoIds: [memoId], isFavorite: !isStarred });
        if (onClick) {
          onClick();
        }
      },
      [memoId, isStarred, favoriteMemos, onClick],
    );

    return (
      <MenuItem
        onClick={handleClick}
        disabled={isPending || memoId === undefined || isStarred === undefined}
        {...props}
      >
        <ListItemIcon>{isStarred ? <StarIcon fontSize="small" /> : <StarOutlineIcon fontSize="small" />}</ListItemIcon>
        <ListItemText>{isStarred ? "Remove from favorites" : "Add to favorites"}</ListItemText>
      </MenuItem>
    );
  },
);
