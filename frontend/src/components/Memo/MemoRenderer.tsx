import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { Stack, StackProps } from "@mui/material";
import { memo } from "react";
import MemoHooks from "../../api/MemoHooks.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
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
  showIcon = false,
  showTitle = false,
  showContent = false,
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
        showIcon={showIcon}
        showTitle={showTitle}
        showContent={showContent}
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
        showIcon={showIcon}
        showTitle={showTitle}
        showContent={showContent}
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
      {showIcon && getIconComponent(Icon.MEMO, { sx: { mr: 1 } })}
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

export default memo(MemoRenderer);
