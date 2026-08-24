import { MemoHooks } from "@api/hooks/MemoHooks";
import { Icon, getIconComponent } from "@components/icons";
import { UserRenderer } from "@core/user";
import { MemoRead } from "@models/MemoRead";
import { MemoRow } from "@models/MemoRow";
import { Box, Card, CardActionArea, CircularProgress, Stack, Typography } from "@mui/material";
import { dateToLocaleDateString, dateToRelativeString } from "@utils/DateUtils";
import { memo, useCallback } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MemoActionMenu } from "../MemoActionMenu";
import { AttachedObjectRenderer } from "../renderer";
import { useGetMemosAttachedObject } from "../useGetMemosAttachedObject";
import { MemoPresentationProps } from "./MemoPresentationProps";
import { getMemoContent, isMemoRow } from "./memoPresentationUtils";

/**
 * The single memo card for the whole application. Renders a memo as a card and
 * is fully customizable through the shared `MemoPresentationProps` flags, so it
 * can serve every surface (workspace gallery, document info panel, whiteboard
 * node, ...). Accepts a `MemoRead`, a `MemoRow`, or an id.
 */
export const MemoCard = memo(({ memo, ...props }: MemoPresentationProps) => {
  if (typeof memo === "number") {
    return <MemoCardWithoutData memoId={memo} {...props} />;
  }
  return <MemoCardWithData memo={memo} {...props} />;
});

const MemoCardWithoutData = memo(({ memoId, ...props }: Omit<MemoPresentationProps, "memo"> & { memoId: number }) => {
  const memo = MemoHooks.useGetMemo(memoId);

  if (memo.isSuccess) return <MemoCardWithData memo={memo.data} {...props} />;
  if (memo.isError) return <Typography color="error">{memo.error.message}</Typography>;
  return <CircularProgress />;
});

const MemoCardWithData = memo(
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
  }: Omit<MemoPresentationProps, "memo"> & { memo: MemoRead | MemoRow }) => {
    const attachedObject = useGetMemosAttachedObject(memo.attached_object_type, memo.attached_object_id);

    const handleClick = useCallback(() => {
      onSelect?.(memo.id);
    }, [onSelect, memo.id]);

    const showHeader = renderAttachedObject;
    const showFooter = renderAuthor || renderCreatedDate || renderUpdatedDate;
    const showContent = renderTitle || (renderContent && getMemoContent(memo).trim().length > 0);
    const content = getMemoContent(memo);

    const actionMenu = (renderFavoriteStatus || renderActionMenu) && (
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
    );

    const body = (
      <Box px={2} py={1.5} display="flex" flexDirection="column" height="100%">
        {/*
          Block wrapper (not flex) so the floated action menu stays at the top and the
          header/title wrap around it, exactly like the original layout. It grows
          (flex: 1) to fill the card height, pushing the footer to the bottom.
        */}
        <Box flex={1} sx={{ "&::after": { content: '""', display: "table", clear: "both" } }}>
          {actionMenu}
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
                  <Typography variant="h6" fontWeight={600} minWidth={0} noWrap>
                    {memo.title}
                  </Typography>
                </Stack>
              )}
              {renderContent && (
                <>
                  {isMemoRow(memo) ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 3,
                        overflow: "hidden",
                      }}
                    >
                      {content}
                    </Typography>
                  ) : (
                    <Box className="markdown-content">
                      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
                    </Box>
                  )}
                </>
              )}
            </Stack>
          )}
        </Box>
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
      <Card
        variant="outlined"
        sx={{
          // Fill the grid cell so all cards in a gallery row share the row height.
          height: "100%",
          ...(renderFavoriteStatus && memo.is_favorite ? { borderLeftWidth: 3, borderLeftColor: "warning.main" } : {}),
        }}
      >
        {onSelect ? (
          <CardActionArea onClick={handleClick} sx={{ height: "100%" }}>
            {body}
          </CardActionArea>
        ) : (
          body
        )}
      </Card>
    );
  },
);
