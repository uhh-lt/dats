import { MemoHooks } from "@api/hooks/MemoHooks";
import { getIconComponent, Icon } from "@components/icons";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo, useCallback } from "react";

interface MemoFavoriteMenuItemProps {
  memoId: number | undefined;
  isFavorite: boolean | undefined;
  onClick?: () => void;
}

export const MemoFavoriteMenuItem = memo(
  ({ memoId, isFavorite, onClick, ...props }: MemoFavoriteMenuItemProps & MenuItemProps) => {
    const { mutate: favoriteMemos, isPending } = MemoHooks.useFavoriteMemos();

    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        if (memoId === undefined || isFavorite === undefined) return;
        event.stopPropagation();
        favoriteMemos({ memoIds: [memoId], isFavorite: !isFavorite });
        if (onClick) {
          onClick();
        }
      },
      [memoId, isFavorite, favoriteMemos, onClick],
    );

    return (
      <MenuItem
        onClick={handleClick}
        disabled={isPending || memoId === undefined || isFavorite === undefined}
        {...props}
      >
        <ListItemIcon>
          {getIconComponent(isFavorite ? Icon.FAVORITE : Icon.FAVORITE_BORDER, { fontSize: "small" })}
        </ListItemIcon>
        <ListItemText>{isFavorite ? "Remove from favorites" : "Add to favorites"}</ListItemText>
      </MenuItem>
    );
  },
);
