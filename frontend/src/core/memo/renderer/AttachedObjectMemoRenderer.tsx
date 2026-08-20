import { MemoHooks } from "@api/hooks/MemoHooks";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { StackProps } from "@mui/material";
import { memo } from "react";
import { MemoRendererSharedProps, MemoRendererWithData } from "./MemoRenderer";

interface AttachedObjectMemoRendererProps {
  attachedObjectType: AttachedObjectType;
  attachedObjectId: number;
}

export const AttachedObjectMemoRenderer = memo(
  ({
    attachedObjectType,
    attachedObjectId,
    showIcon = true,
    showTitle = true,
    showContent = false,
    ...props
  }: AttachedObjectMemoRendererProps & MemoRendererSharedProps & StackProps) => {
    const memos = MemoHooks.useGetObjectMemos(attachedObjectType, attachedObjectId);

    if (memos.isSuccess && memos.data.length > 0) {
      return (
        <>
          {memos.data.map((memo) => (
            <MemoRendererWithData
              key={memo.id}
              memo={memo}
              showIcon={showIcon}
              showTitle={showTitle}
              showContent={showContent}
              {...props}
            />
          ))}
        </>
      );
    } else if (memos.isLoading) {
      return <div>Loading...</div>;
    } else if (memos.isError) {
      return <div>{memos.error.message}</div>;
    } else {
      return <i>empty</i>;
    }
  },
);
