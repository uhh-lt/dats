import { MemoHooks } from "@api/hooks/MemoHooks";
import { Icon, getIconComponent } from "@components/icons";
import { UserRenderer } from "@core/user";
import { MemoRead } from "@models/MemoRead";
import { MemoRow } from "@models/MemoRow";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { dateToLocaleString } from "@utils/DateUtils";
import { memo, useCallback } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MemoActionMenu } from "../MemoActionMenu";
import { MemoFavoriteIconButton } from "../MemoFavoriteIconButton";
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
    renderDate,
    renderFavoriteButton,
    renderAttachedObject,
    attachedObjectLink,
    renderActionMenu,
  }: Omit<MemoPresentationProps, "memo"> & { memo: MemoRead | MemoRow }) => {
    const attachedObject = useGetMemosAttachedObject(memo.attached_object_type, memo.attached_object_id);

    const handleClick = useCallback(() => {
      onSelect?.(memo.id);
    }, [onSelect, memo.id]);

    const showHeader = renderAttachedObject || renderActionMenu;
    const content = getMemoContent(memo);

    const body = (
      <CardContent sx={onSelect ? { p: 1, pb: "0px !important" } : undefined}>
        {renderTitle && (
          <Stack direction="row" alignItems="center" spacing={1}>
            {renderIcon && getIconComponent(Icon.MEMO, { style: { flexShrink: 0 } })}
            <Typography variant="h6" flex={1} minWidth={0} noWrap>
              {memo.title}
            </Typography>
            {renderFavoriteButton && <MemoFavoriteIconButton memo={memo} />}
          </Stack>
        )}
        {renderContent &&
          (isMemoRow(memo) ? (
            <Typography mt={1}>{content}</Typography>
          ) : (
            <Box mt={1} className="markdown-content">
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            </Box>
          ))}
        {(renderAuthor || renderDate) && (
          <Stack direction="row" alignItems="center" mt={1} justifyContent="space-between">
            {renderDate && (
              <Typography variant="subtitle2" color="textSecondary" fontSize={12}>
                Last modified: {dateToLocaleString(memo.updated)}
              </Typography>
            )}
            {renderAuthor && (
              <Typography variant="subtitle2" color="textDisabled" fontSize={12}>
                <UserRenderer user={memo.user_id} />
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
    );

    return (
      <Card variant="outlined">
        {showHeader && (
          <>
            <CardHeader
              title={
                renderAttachedObject && attachedObject.data ? (
                  <AttachedObjectRenderer
                    attachedObject={attachedObject.data}
                    attachedObjectType={memo.attached_object_type}
                    link={attachedObjectLink}
                  />
                ) : undefined
              }
              action={
                renderActionMenu ? (
                  <MemoActionMenu
                    memo={memo as MemoRead}
                    onDeleteClick={onDeleteClick}
                    onStarredClick={onStarredClick}
                    iconButtonProps={{ size: "small" }}
                  />
                ) : undefined
              }
              slotProps={{ title: { variant: "body1", display: "flex", alignItems: "center" } }}
              sx={{ px: 1, py: 0.5 }}
            />
            <Divider />
          </>
        )}
        {onSelect ? <CardActionArea onClick={handleClick}>{body}</CardActionArea> : body}
      </Card>
    );
  },
);
