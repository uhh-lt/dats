import CommentIcon from "@mui/icons-material/Comment";
import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { Stack, StackProps } from "@mui/material";
import MemoHooks from "../../api/MemoHooks.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import UserRenderer from "../User/UserRenderer.tsx";
import AttachedObjectRenderer from "./AttachedObjectRenderer.tsx";

export interface MemoRendererSharedProps {
  showIcon?: boolean;
  showTitle?: boolean;
  showContent?: boolean;
  showUser?: boolean;
  showStar?: boolean;
  showAttachedObject?: boolean;
  attachedObjectLink?: boolean;
}

interface MemoRendererProps {
  memo: number | MemoRead;
}

function MemoRenderer({
  memo,
  showIcon: icon = false,
  showTitle: title = false,
  showContent: content = false,
  showUser = false,
  showStar = false,
  showAttachedObject = false,
  attachedObjectLink = false,
  ...props
}: MemoRendererProps & MemoRendererSharedProps & StackProps) {
  if (typeof memo === "number") {
    return (
      <MemoRendererWithoutData
        memoId={memo}
        showIcon={icon}
        showTitle={title}
        showContent={content}
        showUser={showUser}
        showStar={showStar}
        showAttachedObject={showAttachedObject}
        attachedObjectLink={attachedObjectLink}
        {...props}
      />
    );
  } else {
    return (
      <MemoRendererWithData
        memo={memo}
        showIcon={icon}
        showTitle={title}
        showContent={content}
        showUser={showUser}
        showStar={showStar}
        showAttachedObject={showAttachedObject}
        attachedObjectLink={attachedObjectLink}
        {...props}
      />
    );
  }
}

function MemoRendererWithoutData({ memoId, ...props }: { memoId: number } & MemoRendererSharedProps & StackProps) {
  const memo = MemoHooks.useGetMemo(memoId);

  if (memo.isSuccess) {
    return <MemoRendererWithData memo={memo.data} {...props} />;
  } else if (memo.isError) {
    return <div>{memo.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

export function MemoRendererWithData({
  memo,
  showIcon,
  showTitle,
  showContent,
  showUser,
  showStar,
  showAttachedObject,
  attachedObjectLink,
  ...props
}: { memo: MemoRead } & MemoRendererSharedProps & StackProps) {
  return (
    <Stack direction="row" alignItems="center" {...props}>
      {showIcon && <CommentIcon sx={{ mr: 1 }} />}
      {showTitle && memo.title}
      {showContent && memo.content}
      {showUser && <UserRenderer user={memo.user_id} />}
      {showStar && (memo.starred ? <StarIcon /> : <StarOutlineIcon />)}
      {showAttachedObject && (
        <AttachedObjectRenderer
          attachedObject={memo.attached_object_id}
          attachedObjectType={memo.attached_object_type}
          link={attachedObjectLink}
        />
      )}
    </Stack>
  );
}

export default MemoRenderer;
