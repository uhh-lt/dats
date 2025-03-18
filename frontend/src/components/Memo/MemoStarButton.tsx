import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import MemoHooks from "../../api/MemoHooks.ts";

interface MemoStarButtonProps {
  memoIds: number[];
  isStarred: boolean;
}

function MemoStarButton({ memoIds, isStarred, ...props }: MemoStarButtonProps & IconButtonProps) {
  // mutation
  const starMutation = MemoHooks.useStarMemos();

  // ui events
  const handleClick = () => {
    starMutation.mutate({
      memoIds,
      isStarred,
    });
  };

  return (
    <Tooltip title={isStarred ? "Mark as favorite" : "Mark as normal"}>
      <span>
        <IconButton onClick={handleClick} disabled={starMutation.isPending} {...props}>
          {isStarred ? <StarIcon /> : <StarOutlineIcon />}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default MemoStarButton;
