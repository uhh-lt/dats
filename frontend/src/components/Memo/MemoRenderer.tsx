import CommentIcon from "@mui/icons-material/Comment";
import { Stack, StackProps } from "@mui/material";
import MemoHooks from "../../api/MemoHooks.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";

export interface MemoRendererSharedProps {
  showIcon?: boolean;
  showTitle?: boolean;
  showContent?: boolean;
}

interface MemoRendererProps {
  memo: number | MemoRead;
}

function MemoRenderer({
  memo,
  showIcon: icon = true,
  showTitle: title = true,
  showContent: content = false,
  ...props
}: MemoRendererProps & MemoRendererSharedProps & StackProps) {
  if (typeof memo === "number") {
    return <MemoRendererWithoutData memoId={memo} showIcon={icon} showTitle={title} showContent={content} {...props} />;
  } else {
    return <MemoRendererWithData memo={memo} showIcon={icon} showTitle={title} showContent={content} {...props} />;
  }
}

function MemoRendererWithoutData({
  memoId,
  showIcon: icon,
  showTitle: title,
  showContent: content,
  ...props
}: { memoId: number } & MemoRendererSharedProps & StackProps) {
  const memo = MemoHooks.useGetMemo(memoId);

  if (memo.isSuccess) {
    return <MemoRendererWithData memo={memo.data} showIcon={icon} showTitle={title} showContent={content} {...props} />;
  } else if (memo.isError) {
    return <div>{memo.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

export function MemoRendererWithData({
  memo,
  showIcon: icon,
  showTitle: title,
  showContent: content,
  ...props
}: { memo: MemoRead } & MemoRendererSharedProps & StackProps) {
  return (
    <Stack direction="row" alignItems="center" {...props}>
      {icon && <CommentIcon sx={{ mr: 1 }} />}
      {title && memo.title}
      {content && memo.content}
    </Stack>
  );
}

export default MemoRenderer;
