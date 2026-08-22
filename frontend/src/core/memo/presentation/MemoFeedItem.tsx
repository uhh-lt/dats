import { MemoHooks } from "@api/hooks/MemoHooks";
import { UserRenderer } from "@core/user";
import { MemoRead } from "@models/MemoRead";
import { MemoRow } from "@models/MemoRow";
import { CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { dateToLocaleString } from "@utils/DateUtils";
import { formatOptionLabel } from "@utils/StringUtils";
import { memo, useCallback } from "react";
import { MemoFavoriteIconButton } from "../MemoFavoriteIconButton";
import { MemoPresentationProps } from "./MemoPresentationProps";
import { getMemoContent } from "./memoPresentationUtils";

/**
 * A memo rendered as a feed entry (paper with a metadata line). Shares the
 * `MemoPresentationProps` flags with the other presentation containers. Accepts
 * a `MemoRead`, a `MemoRow`, or an id.
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
    renderTitle,
    renderContent,
    renderAuthor,
    renderDate,
    renderFavoriteButton,
    renderAttachedObject,
  }: Omit<MemoPresentationProps, "memo"> & { memo: MemoRead | MemoRow }) => {
    const handleClick = useCallback(() => {
      onSelect?.(memo.id);
    }, [onSelect, memo.id]);

    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row">
          {renderTitle && (
            <Typography variant="h6" flex={1} onClick={handleClick} sx={onSelect ? { cursor: "pointer" } : undefined}>
              {memo.title}
            </Typography>
          )}
          {renderFavoriteButton && <MemoFavoriteIconButton memo={memo} />}
        </Stack>
        {(renderAuthor || renderDate || renderAttachedObject) && (
          <Typography variant="body2" color="text.secondary" component="div">
            {renderAuthor && <UserRenderer user={memo.user_id} />}
            {renderDate && ` · ${dateToLocaleString(memo.updated)}`}
            {renderAttachedObject && ` · ${formatOptionLabel(memo.attached_object_type)}`}
          </Typography>
        )}
        {renderContent && (
          <Typography mt={1} whiteSpace="pre-wrap">
            {getMemoContent(memo)}
          </Typography>
        )}
      </Paper>
    );
  },
);
