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
    const { mutate: updateMemos, isPending } = MemoHooks.useUpdateMemos();

    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        if (memoId === undefined || isFavorite === undefined) return;
        event.stopPropagation();
        updateMemos({ requestBody: [{ memo_id: memoId, is_favorite: !isFavorite }] });
        if (onClick) {
          onClick();
        }
      },
      [memoId, isFavorite, updateMemos, onClick],
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
