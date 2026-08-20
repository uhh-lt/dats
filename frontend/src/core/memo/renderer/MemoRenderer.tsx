import { MemoHooks } from "@api/hooks/MemoHooks";
import { ExpandableRenderer, ExpandableRendererProps } from "@components/ExpandableRenderer";
import { Icon, getIconComponent } from "@components/icons";
import { UserRenderer } from "@core/user";
import { MemoRead } from "@models/MemoRead";
import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { Box, Stack, Typography } from "@mui/material";
import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AttachedObjectRenderer } from "./AttachedObjectRenderer";

export interface MemoRendererSharedProps extends ExpandableRendererProps {
  showIcon?: boolean;
  showTitle?: boolean;
  showContent?: boolean;
  showUser?: boolean;
  showStar?: boolean;
  showAttachedObject?: boolean;
  attachedObjectLink?: boolean;
}

interface MemoRendererProps extends MemoRendererSharedProps {
  memo: number | MemoRead;
}

export const MemoRenderer = memo(({ memo, ...props }: MemoRendererProps) => {
  if (typeof memo === "number") {
    return <MemoRendererWithoutData memoId={memo} {...props} />;
  } else {
    return <MemoRendererWithData memo={memo} {...props} />;
  }
});

const MemoRendererWithoutData = memo(({ memoId, ...props }: { memoId: number } & MemoRendererSharedProps) => {
  const memo = MemoHooks.useGetMemo(memoId);

  if (memo.isSuccess) {
    return <MemoRendererWithData memo={memo.data} {...props} />;
  } else if (memo.isError) {
    return <div>{memo.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
});

export const MemoRendererWithData = memo(
  ({
    memo,
    showIcon,
    showTitle,
    showContent,
    showUser,
    showStar,
    showAttachedObject,
    attachedObjectLink,
    ...expandProps
  }: { memo: MemoRead } & MemoRendererSharedProps) => {
    return (
      <ExpandableRenderer {...expandProps} expandedContent={<MemoContext memo={memo} />}>
        <Stack direction="row" alignItems="center" spacing={1} minWidth={0} maxWidth="100%" overflow="hidden">
          {showIcon && getIconComponent(Icon.MEMO, { style: { flexShrink: 0 } })}
          {showTitle && (
            <Typography component="span" noWrap minWidth={0}>
              {memo.title}
            </Typography>
          )}
          {showContent && (
            <Box className="markdown-content" minWidth={0}>
              <Markdown remarkPlugins={[remarkGfm]}>{memo.content}</Markdown>
            </Box>
          )}
          {showUser && <UserRenderer user={memo.user_id} />}
          {showStar && (memo.is_favorite ? <StarIcon /> : <StarOutlineIcon />)}
          {showAttachedObject && (
            <AttachedObjectRenderer
              attachedObject={memo.attached_object_id}
              attachedObjectType={memo.attached_object_type}
              link={attachedObjectLink}
            />
          )}
        </Stack>
      </ExpandableRenderer>
    );
  },
);

function MemoContext({ memo }: { memo: MemoRead }) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{memo.title}</Typography>
      <Box className="markdown-content">
        <Markdown remarkPlugins={[remarkGfm]}>{memo.content}</Markdown>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Attached to: {memo.attached_object_type} #{memo.attached_object_id}
      </Typography>
    </Stack>
  );
}
