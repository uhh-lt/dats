import { MemoHooks } from "@api/hooks/MemoHooks";
import { UserRenderer } from "@core/user";
import { MemoRead } from "@models/MemoRead";
import { Box, CardActionArea, CircularProgress, Stack, Typography } from "@mui/material";
import { dateToLocaleDateString, dateToRelativeString } from "@utils/DateUtils";
import { memo, useCallback } from "react";
import { MemoActionMenu } from "../MemoActionMenu";
import { AttachedObjectRenderer } from "../renderer";
import { useGetMemosAttachedObject } from "../useGetMemosAttachedObject";
import { MemoPresentationProps } from "./MemoPresentationProps";

/**
 * A memo rendered as a compact list row: title and content first, then a
 * metadata footer (author, dates, attached object). Favorite status is shown
 * via an amber left border; the favorite toggle and action menu sit at the top
 * right. Shares the `MemoPresentationProps` flags with the other presentation
 * containers. Accepts a `MemoRead` or an id.
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
    onDeleteClick,
    onStarredClick,
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

    const showFooter = renderAuthor || renderCreatedDate || renderUpdatedDate || renderAttachedObject;

    return (
      <CardActionArea onClick={handleClick}>
        <Box
          p={1.5}
          sx={
            renderFavoriteStatus && memo.is_favorite
              ? { borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: "warning.main" }
              : undefined
          }
        >
          <Box minWidth={0}>
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
            {renderTitle && (
              <Typography fontWeight={600} noWrap>
                {memo.title}
              </Typography>
            )}
            {renderContent && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {memo.content}
              </Typography>
            )}
            {showFooter && (
              <Stack mt={0.5} spacing={0.25}>
                {renderAuthor && (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      Author:
                    </Typography>
                    <Box color="text.secondary" sx={{ "& .MuiTypography-root": { fontSize: "0.75rem" } }}>
                      <UserRenderer user={memo.user_id} />
                    </Box>
                  </Stack>
                )}
                {(renderUpdatedDate || renderCreatedDate) && (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {renderUpdatedDate && `Updated: ${dateToRelativeString(memo.updated)}`}
                    {renderUpdatedDate && renderCreatedDate && " | "}
                    {renderCreatedDate && `Created: ${dateToLocaleDateString(memo.created)}`}
                  </Typography>
                )}
                {renderAttachedObject && attachedObject.data && (
                  <Stack direction="row" alignItems="center" spacing={0.5} minWidth={0}>
                    <Typography variant="caption" color="text.secondary" noWrap flexShrink={0}>
                      Attached to:
                    </Typography>
                    <Box minWidth={0} color="text.secondary" sx={{ "& .MuiTypography-root": { fontSize: "0.75rem" } }}>
                      <AttachedObjectRenderer
                        attachedObject={attachedObject.data}
                        attachedObjectType={memo.attached_object_type}
                        link={attachedObjectLink}
                      />
                    </Box>
                  </Stack>
                )}
              </Stack>
            )}
          </Box>
        </Box>
      </CardActionArea>
    );
  },
);
