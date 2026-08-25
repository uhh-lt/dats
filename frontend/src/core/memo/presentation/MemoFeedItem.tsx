import { MemoHooks } from "@api/hooks/MemoHooks";
import { Icon, getIconComponent } from "@components/icons";
import { UserRenderer } from "@core/user";
import { MemoRead } from "@models/MemoRead";
import { Box, CardActionArea, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { dateToLocaleDateString, dateToRelativeString } from "@utils/DateUtils";
import { memo, useCallback } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MemoActionMenu } from "../MemoActionMenu";
import { AttachedObjectRenderer } from "../renderer";
import { useGetMemosAttachedObject } from "../useGetMemosAttachedObject";
import { MemoPresentationProps } from "./MemoPresentationProps";

/**
 * A memo rendered as a feed entry. Shares the `MemoCard` design and click
 * behavior (the whole item triggers `onSelect`), but renders the full content
 * without excerpt clamping. Accepts a `MemoRead` or an id.
 */
export const MemoFeedItem = memo(({ memo, ...props }: MemoPresentationProps) => {
  if (typeof memo === "number") {
    return <MemoFeedItemWithoutData memoId={memo} {...props} />;
  }
  return <MemoFeedItemWithData memo={memo} {...props} />;
});

const MemoFeedItemWithoutData = memo(
  ({ memoId, ...props }: Omit<MemoPresentationProps, "memo"> & { memoId: number }) => {
    const memo = MemoHooks.useGetMemo(memoId);

    if (memo.isSuccess) return <MemoFeedItemWithData memo={memo.data} {...props} />;
    if (memo.isError) return <Typography color="error">{memo.error.message}</Typography>;
    return <CircularProgress />;
  },
);

const MemoFeedItemWithData = memo(
  ({
    memo,
    onSelect,
    onDeleteClick,
    onStarredClick,
    renderIcon,
    renderTitle,
    renderContent,
    renderAuthor,
    renderCreatedDate,
    renderUpdatedDate,
    renderFavoriteStatus,
    renderAttachedObject,
    attachedObjectLink,
    renderActionMenu,
  }: Omit<MemoPresentationProps, "memo"> & { memo: MemoRead }) => {
    const attachedObject = useGetMemosAttachedObject(memo.attached_object_type, memo.attached_object_id);

    const handleClick = useCallback(() => {
      onSelect?.(memo.id);
    }, [onSelect, memo.id]);

    const showHeader = renderAttachedObject;
    const showFooter = renderAuthor || renderCreatedDate || renderUpdatedDate;
    const showContent = renderTitle || (renderContent && memo.content.trim().length > 0);

    const body = (
      <Box px={2} py={1.5} sx={{ "&::after": { content: '""', display: "table", clear: "both" } }}>
        {(renderFavoriteStatus || renderActionMenu) && (
          <Box sx={{ float: "right", ml: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
            {renderActionMenu && (
              <MemoActionMenu
                memo={memo as MemoRead}
                onDeleteClick={onDeleteClick}
                onStarredClick={onStarredClick}
                iconButtonProps={{ size: "small" }}
              />
            )}
          </Box>
        )}
        {showHeader && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {renderAttachedObject && attachedObject.data && (
              <AttachedObjectRenderer
                attachedObject={attachedObject.data}
                attachedObjectType={memo.attached_object_type}
                link={attachedObjectLink}
              />
            )}
          </Stack>
        )}
        {showContent && (
          <Stack sx={{ mt: showHeader ? 1 : 0 }}>
            {renderTitle && (
              <Stack direction="row" alignItems="center" spacing={1}>
                {renderIcon && getIconComponent(Icon.MEMO, { style: { flexShrink: 0 } })}
                <Typography variant="h6" fontWeight={600} minWidth={0}>
                  {memo.title}
                </Typography>
              </Stack>
            )}
            {renderContent && (
              <Box className="markdown-content">
                <Markdown remarkPlugins={[remarkGfm]}>{memo.content}</Markdown>
              </Box>
            )}
          </Stack>
        )}
        {showFooter && (
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: showContent ? 2 : showHeader ? 1 : 0 }}>
            {renderAuthor ? (
              <Box
                flex={1}
                minWidth={0}
                color="text.secondary"
                sx={{ "& .MuiTypography-root": { fontSize: "0.75rem" } }}
              >
                <UserRenderer user={memo.user_id} renderAvatar />
              </Box>
            ) : (
              <Box flex={1} />
            )}
            {renderUpdatedDate && (
              <Typography variant="caption" color="text.secondary" noWrap>
                Edited {dateToRelativeString(memo.updated)}
              </Typography>
            )}
            {renderCreatedDate && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {dateToLocaleDateString(memo.created)}
              </Typography>
            )}
          </Stack>
        )}
      </Box>
    );

    return (
      <Paper
        variant="outlined"
        sx={
          renderFavoriteStatus && memo.is_favorite ? { borderLeftWidth: 3, borderLeftColor: "warning.main" } : undefined
        }
      >
        {onSelect ? <CardActionArea onClick={handleClick}>{body}</CardActionArea> : body}
      </Paper>
    );
  },
);
