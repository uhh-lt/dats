import { IconButton, IconButtonProps, Tooltip, Typography } from "@mui/material";
import { memo, useCallback } from "react";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import { MemoDialogAPI } from "./MemoDialogAPI.ts";
import { MemoEvent } from "./MemoEvent.ts";

export const MemoEditButton = memo(
  ({ memoId, attachedObjectType, attachedObjectId, ...props }: MemoEvent & IconButtonProps) => {
    const handleClickOpen = useCallback(() => {
      MemoDialogAPI.openMemo({ memoId, attachedObjectType, attachedObjectId });
    }, [memoId, attachedObjectType, attachedObjectId]);

    return (
      <Tooltip title={"Edit memo"}>
        <span>
          <IconButton onClick={handleClickOpen} size="small" disabled={!memoId} disableRipple {...props}>
            {getIconComponent(Icon.EDIT, { fontSize: "inherit" })}
            <Typography variant="body1">Edit Memo</Typography>
          </IconButton>
        </span>
      </Tooltip>
    );
  },
);
