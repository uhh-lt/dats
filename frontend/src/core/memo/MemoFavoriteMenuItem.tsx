import { getIconComponent, Icon } from "@components/icons";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { memo, useCallback } from "react";
import { MemoHooks } from "./api/memoHooks";

interface MemoFavoriteMenuItemProps {
  memoId: number | undefined;
  isFavorite: boolean | undefined;
  onClick?: () => void;
}

export const MemoFavoriteMenuItem = memo(
  ({ memoId, isFavorite, onClick, ...props }: MemoFavoriteMenuItemProps & MenuItemProps) => {
    const projectId = useParams({ strict: false, select: (params) => params.projectId });
    const { mutate: updateMemos, isPending } = MemoHooks.useUpdateMemos();

    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        if (projectId === undefined || memoId === undefined || isFavorite === undefined) return;
        event.stopPropagation();
        updateMemos({ projectId, requestBody: [{ memo_id: memoId, is_favorite: !isFavorite }] });
        if (onClick) {
          onClick();
        }
      },
      [projectId, memoId, isFavorite, updateMemos, onClick],
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
