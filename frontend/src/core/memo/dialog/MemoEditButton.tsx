import { IconButton, IconButtonProps, Tooltip, Typography } from "@mui/material";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";
import { memo } from "react";
import { MemoEvent } from "./_types/MemoEvent";
import { useOpenMemoDialog } from "./useOpenMemoDialog";

export const MemoEditButton = memo(
  ({ memoId, attachedObjectType, attachedObjectId, ...props }: MemoEvent & IconButtonProps) => {
    const openMemoDialog = useOpenMemoDialog();
    return (
      <Tooltip title={"Edit memo"}>
        <span>
          <IconButton
            onClick={() => openMemoDialog({ memoId, attachedObjectType, attachedObjectId })}
            size="small"
            disabled={!memoId}
            disableRipple
            {...props}
          >
            {getIconComponent(Icon.EDIT, { fontSize: "inherit" })}
            <Typography variant="body1">Edit Memo</Typography>
          </IconButton>
        </span>
      </Tooltip>
    );
  },
);
