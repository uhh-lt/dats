import EditIcon from "@mui/icons-material/Edit";
import { IconButton, IconButtonProps, Tooltip, Typography } from "@mui/material";
import MemoAPI, { MemoEvent } from "./MemoAPI.ts";

function MemoEditButton({ memoId, attachedObjectType, attachedObjectId, ...props }: MemoEvent & IconButtonProps) {
  const handleClickOpen = () => {
    MemoAPI.openMemo({ memoId, attachedObjectType, attachedObjectId });
  };

  return (
    <Tooltip title={"Edit memo"}>
      <span>
        <IconButton onClick={handleClickOpen} size="small" disabled={!memoId} disableRipple {...props}>
          <EditIcon fontSize="inherit" />
          <Typography variant="body1">Edit Memo</Typography>
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default MemoEditButton;
