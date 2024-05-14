import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { IconButton, IconButtonProps, Tooltip, Typography } from "@mui/material";
import MemoHooks from "../../api/MemoHooks.ts";
import SnackbarAPI from "../Snackbar/SnackbarAPI.ts";

interface MemoStarButtonProps {
  memoId: number;
  isStarred: boolean;
}

function MemoStarButton({ memoId, isStarred, ...props }: MemoStarButtonProps & IconButtonProps) {
  // mutation
  const updateMutation = MemoHooks.useUpdateMemo();

  // ui events
  const handleClick = () => {
    updateMutation.mutate(
      {
        memoId: memoId,
        requestBody: {
          starred: !isStarred,
        },
      },
      {
        onSuccess: (memo) => {
          SnackbarAPI.openSnackbar({
            text: `Toggled favorite status of memo ${memo.id}`,
            severity: "success",
          });
        },
      },
    );
  };

  return (
    <Tooltip title={isStarred ? "Marked" : "Not marked"}>
      <span style={{ width: "100%" }}>
        <IconButton size="small" onClick={handleClick} disabled={updateMutation.isPending} disableRipple {...props}>
          {isStarred ? <StarIcon /> : <StarOutlineIcon />}
          <Typography variant="body1">Star Memo</Typography>
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default MemoStarButton;
