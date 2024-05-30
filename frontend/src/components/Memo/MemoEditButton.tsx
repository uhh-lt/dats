import EditIcon from "@mui/icons-material/Edit";
import { IconButton, IconButtonProps, Tooltip, Typography } from "@mui/material";
import MemoDialogAPI, { MemoEvent } from "./MemoDialog/MemoDialogAPI.ts";

function MemoEditButton({ memoId, attachedObjectType, attachedObjectId, ...props }: MemoEvent & IconButtonProps) {
  const handleClickOpen = () => {
    MemoDialogAPI.openMemo({ memoId, attachedObjectType, attachedObjectId });
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
