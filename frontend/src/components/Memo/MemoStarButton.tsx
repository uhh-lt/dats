import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import MemoHooks from "../../api/MemoHooks.ts";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";

interface MemoStarButtonProps {
  memoIds: number[];
  isStarred: boolean;
}

function MemoStarButton({ memoIds, isStarred, ...props }: MemoStarButtonProps & IconButtonProps) {
  // mutation
  const starMutation = MemoHooks.useStarMemos();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // ui events
  const handleClick = () => {
    starMutation.mutate(
      {
        memoIds,
        isStarred,
      },
      {
        onSuccess: (memos) => {
          openSnackbar({
            text: `Set favorite status of ${memos.length} Memo(s) to ${isStarred ? "favorite" : "normal"}!`,
            severity: "success",
          });
        },
      },
    );
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
