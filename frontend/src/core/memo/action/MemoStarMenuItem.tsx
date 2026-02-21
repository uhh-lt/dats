import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo, useCallback } from "react";
import { MemoHooks } from "../../../api/MemoHooks.ts";

interface MemoStarButtonProps {
  memoId: number | undefined;
  isStarred: boolean | undefined;
  onClick?: () => void;
}

export const MemoStarMenuItem = memo(
  ({ memoId, isStarred, onClick, ...props }: MemoStarButtonProps & MenuItemProps) => {
    const { mutate: updateMemo, isPending } = MemoHooks.useUpdateMemo();

    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        if (memoId === undefined || isStarred === undefined) return;
        event.stopPropagation();
        updateMemo({
          memoId: memoId,
          requestBody: {
            starred: !isStarred,
          },
        });
        if (onClick) {
          onClick();
        }
      },
      [memoId, isStarred, updateMemo, onClick],
    );

    return (
      <MenuItem
        onClick={handleClick}
        disabled={isPending || memoId === undefined || isStarred === undefined}
        {...props}
      >
        <ListItemIcon>{isStarred ? <StarIcon fontSize="small" /> : <StarOutlineIcon fontSize="small" />}</ListItemIcon>
        <ListItemText>Mark/unmark memo</ListItemText>
      </MenuItem>
    );
  },
);
