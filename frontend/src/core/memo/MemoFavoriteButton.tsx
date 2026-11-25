import { getIconComponent, Icon } from "@components/icons";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { memo, useCallback } from "react";
import { MemoHooks } from "./api/memoHooks";

interface MemoFavoriteButtonProps {
  memoIds: number[];
  isFavorite: boolean;
}

export const MemoFavoriteButton = memo(
  ({ memoIds, isFavorite, ...props }: MemoFavoriteButtonProps & IconButtonProps) => {
    const projectId = useParams({ strict: false, select: (params) => params.projectId });
    const { mutate: updateMemos, isPending } = MemoHooks.useUpdateMemos();

    const handleClick = useCallback(() => {
      if (projectId === undefined) return;
      updateMemos({
        projectId,
        requestBody: memoIds.map((memoId) => ({ memo_id: memoId, is_favorite: !isFavorite })),
      });
    }, [projectId, memoIds, isFavorite, updateMemos]);

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
