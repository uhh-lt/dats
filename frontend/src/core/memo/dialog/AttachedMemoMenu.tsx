import { MemoHooks } from "@api/hooks/MemoHooks";
import { UserAvatar } from "@core/user";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { MemoRead } from "@models/MemoRead";
import AddIcon from "@mui/icons-material/Add";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import { memo, ReactNode, useCallback, useState } from "react";
import { MemoCreateSuccessHandler } from "./types/MemoCreateSuccessHandler";
import { useOpenMemoDialog } from "./useOpenMemoDialog";

interface AttachedMemoMenuProps {
  attachedObjectType: AttachedObjectType;
  attachedObjectId: number;
  onCreateSuccess?: MemoCreateSuccessHandler;
  onAction?: () => void;
  menuPlacement?: "bottom" | "right";
  renderTrigger: (handleClick: (event: React.MouseEvent<HTMLElement>) => void, isFetching: boolean) => ReactNode;
}

/**
 * AttachedMemoMenu orchestrates the memo menu flow:
 * 1. Renders a trigger via renderTrigger prop
 * 2. On click, fetches attached memos lazily
 * 3. If no memos exist, opens the memo editor directly
 * 4. If memos exist, opens a menu listing them
 */
export const AttachedMemoMenu = memo(
  ({
    attachedObjectType,
    attachedObjectId,
    onCreateSuccess,
    onAction,
    menuPlacement = "bottom",
    renderTrigger,
  }: AttachedMemoMenuProps) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const memos = MemoHooks.useGetObjectMemos(attachedObjectType, attachedObjectId, { enabled: false });
    const openMemoDialog = useOpenMemoDialog();

    const handleOpen = useCallback(
      async (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        const trigger = event.currentTarget;
        const attachedMemos = memos.data ?? (await memos.refetch()).data;

        if (attachedMemos?.length === 0) {
          onAction?.();
          openMemoDialog({ attachedObjectType, attachedObjectId, onCreateSuccess });
          return;
        }

        setAnchorEl(trigger);
      },
      [attachedObjectId, attachedObjectType, memos, onAction, onCreateSuccess, openMemoDialog],
    );

    const handleClose = useCallback(
      (event?: object) => {
        if (event && "stopPropagation" in event && typeof event.stopPropagation === "function") {
          event.stopPropagation();
        }
        if (event && "preventDefault" in event && typeof event.preventDefault === "function") {
          event.preventDefault();
        }
        setAnchorEl(null);
        onAction?.();
      },
      [onAction],
    );

    const handleOpenMemo = useCallback(
      (event: React.MouseEvent<HTMLElement>, memoId: number) => {
        event.stopPropagation();
        setAnchorEl(null);
        onAction?.();
        openMemoDialog({ memoId, attachedObjectType, attachedObjectId, onCreateSuccess });
      },
      [attachedObjectId, attachedObjectType, onAction, onCreateSuccess, openMemoDialog],
    );

    const handleCreateMemo = useCallback(
      (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setAnchorEl(null);
        onAction?.();
        openMemoDialog({ attachedObjectType, attachedObjectId, onCreateSuccess });
      },
      [attachedObjectId, attachedObjectType, onAction, onCreateSuccess, openMemoDialog],
    );

    return (
      <>
        {renderTrigger(handleOpen, memos.isFetching)}
        <AttachedMemoMenuContent
          anchorEl={anchorEl}
          onClose={handleClose}
          memos={memos.data ?? []}
          onOpenMemo={handleOpenMemo}
          onCreateMemo={handleCreateMemo}
          menuPlacement={menuPlacement}
        />
      </>
    );
  },
);

interface AttachedMemoMenuContentProps {
  anchorEl: HTMLElement | null;
  onClose: (event?: object) => void;
  memos: Array<MemoRead>;
  onOpenMemo: (event: React.MouseEvent<HTMLElement>, memoId: number) => void;
  onCreateMemo: (event: React.MouseEvent<HTMLElement>) => void;
  menuPlacement: "bottom" | "right";
}

/**
 * AttachedMemoMenuContent renders the actual menu with memo items.
 * Assumes memos are already loaded — no loading or error states.
 */
const AttachedMemoMenuContent = memo(
  ({ anchorEl, onClose, memos, onOpenMemo, onCreateMemo, menuPlacement }: AttachedMemoMenuContentProps) => {
    return (
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={onClose}
        anchorOrigin={
          menuPlacement === "right"
            ? { vertical: "top", horizontal: "right" }
            : { vertical: "bottom", horizontal: "left" }
        }
        transformOrigin={
          menuPlacement === "right" ? { vertical: "top", horizontal: "left" } : { vertical: "top", horizontal: "left" }
        }
        slotProps={{
          paper: {
            sx: {
              width: 320,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: 420,
            },
          },
          list: {
            disablePadding: true,
            onClick: (event) => event.stopPropagation(),
          },
        }}
      >
        {memos.map((memo) => (
          <MenuItem
            key={memo.id}
            onClick={(event) => onOpenMemo(event, memo.id)}
            sx={{ minWidth: 0, height: 42, minHeight: "42px !important", py: 0 }}
          >
            <ListItemIcon>
              <UserAvatar user={memo.user_id} tooltipPlacement="left" sx={{ width: 30, height: 30, fontSize: 13 }} />
            </ListItemIcon>
            <ListItemText
              disableTypography
              sx={{ minWidth: 0 }}
              primary={
                <Typography noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {memo.title || "Untitled"}
                </Typography>
              }
            />
          </MenuItem>
        ))}
        <MenuItem
          onClick={onCreateMemo}
          sx={{ height: 42, minHeight: "42px !important", py: 0, borderTop: 1, borderColor: "divider" }}
        >
          <ListItemIcon>
            <Box width={30} display="flex" justifyContent="center">
              <AddIcon fontSize="small" />
            </Box>
          </ListItemIcon>
          <ListItemText primary="Add new memo" />
        </MenuItem>
      </Menu>
    );
  },
);
