import { Icon, getIconComponent } from "@components/icons";
import { CircularProgress, IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { memo } from "react";
import { AttachedMemoMenu } from "./AttachedMemoMenu";
import { MemoEvent } from "./types/MemoEvent";

interface MemoButtonProps {
  onClick?: () => void;
}

export const MemoButton = memo(
  ({ attachedObjectType, attachedObjectId, onClick, ...props }: MemoButtonProps & MemoEvent & IconButtonProps) => {
    if (!attachedObjectId) return null;

    return (
      <AttachedMemoMenu
        attachedObjectType={attachedObjectType}
        attachedObjectId={attachedObjectId}
        renderTrigger={(handleClick, isFetching) => (
          <Tooltip title="Memos">
            <span>
              <IconButton
                onClick={(event) => {
                  onClick?.();
                  handleClick(event);
                }}
                disabled={isFetching}
                {...props}
              >
                {isFetching ? <CircularProgress size={20} /> : getIconComponent(Icon.MEMO)}
              </IconButton>
            </span>
          </Tooltip>
        )}
      />
    );
  },
);
