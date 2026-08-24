import { MemoHooks } from "@api/hooks/MemoHooks";
import { UserRenderer } from "@core/user";
import { MemoRead } from "@models/MemoRead";
import { MemoRow } from "@models/MemoRow";
import { Box, CardActionArea, CircularProgress, Stack, Typography } from "@mui/material";
import { dateToLocaleString } from "@utils/DateUtils";
import { formatOptionLabel } from "@utils/StringUtils";
import { memo, useCallback } from "react";
import { MemoFavoriteIconButton } from "../MemoFavoriteIconButton";
import { MemoPresentationProps } from "./MemoPresentationProps";
import { getMemoContent } from "./memoPresentationUtils";

/**
 * A memo rendered as a compact list row. Shares the `MemoPresentationProps`
 * flags with the other presentation containers. Accepts a `MemoRead`, a
 * `MemoRow`, or an id.
 */
export const MemoListItem = memo(({ memo, ...props }: MemoPresentationProps) => {
  if (typeof memo === "number") {
    return <MemoListItemWithoutData memoId={memo} {...props} />;
  }
  return <MemoListItemWithData memo={memo} {...props} />;
});

const MemoListItemWithoutData = memo(
  ({ memoId, ...props }: Omit<MemoPresentationProps, "memo"> & { memoId: number }) => {
    const memo = MemoHooks.useGetMemo(memoId);

    if (memo.isSuccess) return <MemoListItemWithData memo={memo.data} {...props} />;
    if (memo.isError) return <Typography color="error">{memo.error.message}</Typography>;
    return <CircularProgress />;
  },
);

const MemoListItemWithData = memo(
  ({
    memo,
    onSelect,
    renderTitle,
    renderContent,
    renderAuthor,
    renderCreatedDate,
    renderUpdatedDate,
    renderFavoriteStatus,
    renderAttachedObject,
  }: Omit<MemoPresentationProps, "memo"> & { memo: MemoRead | MemoRow }) => {
    const handleClick = useCallback(() => {
      onSelect?.(memo.id);
    }, [onSelect, memo.id]);

    const subtitle = getMemoContent(memo) || formatOptionLabel(memo.attached_object_type);

    return (
      <CardActionArea onClick={handleClick}>
        <Stack direction="row" p={1.5} alignItems="center">
          <Box flex={1} minWidth={0}>
            {renderTitle && <Typography fontWeight={600}>{memo.title}</Typography>}
            {renderContent && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {subtitle}
              </Typography>
            )}
            {(renderAuthor || renderCreatedDate || renderUpdatedDate || renderAttachedObject) && (
              <Typography variant="caption" color="text.secondary" noWrap component="span">
                {renderAuthor && <UserRenderer user={memo.user_id} />}
                {renderCreatedDate && ` · created ${dateToLocaleString(memo.created)}`}
                {renderUpdatedDate && ` · updated ${dateToLocaleString(memo.updated)}`}
                {renderAttachedObject && ` · ${formatOptionLabel(memo.attached_object_type)}`}
              </Typography>
            )}
          </Box>
          {renderFavoriteStatus && <MemoFavoriteIconButton memo={memo} />}
        </Stack>
      </CardActionArea>
    );
  },
);
