import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { memo, useCallback } from "react";
import { MemoHooks } from "../../../api/MemoHooks.ts";

interface MemoStarButtonProps {
  memoIds: number[];
  isStarred: boolean;
}

export const MemoStarButton = memo(({ memoIds, isStarred, ...props }: MemoStarButtonProps & IconButtonProps) => {
  const { mutate: starMemos, isPending } = MemoHooks.useStarMemos();

  const handleClick = useCallback(() => {
    starMemos({
      memoIds,
      isStarred,
    });
  }, [memoIds, isStarred, starMemos]);

  return (
    <Tooltip title={isStarred ? "Mark as favorite" : "Mark as normal"}>
      <span>
        <IconButton onClick={handleClick} disabled={isPending} {...props}>
          {isStarred ? <StarIcon /> : <StarOutlineIcon />}
        </IconButton>
      </span>
    </Tooltip>
  );
});
