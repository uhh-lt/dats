import { StackProps } from "@mui/material";
import { memo } from "react";
import { MemoHooks } from "../../../api/MemoHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { MemoRendererSharedProps, MemoRendererWithData } from "./MemoRenderer.tsx";

interface MemoRenderer2Props {
  attachedObjectType: AttachedObjectType;
  attachedObjectId: number;
}

export const MemoRenderer2 = memo(
  ({
    attachedObjectType,
    attachedObjectId,
    showIcon = true,
    showTitle = true,
    showContent = false,
    ...props
  }: MemoRenderer2Props & MemoRendererSharedProps & StackProps) => {
    const memo = MemoHooks.useGetUserMemo(attachedObjectType, attachedObjectId);

    if (memo.isSuccess && memo.data !== null && memo.data !== undefined) {
      return (
        <MemoRendererWithData
          memo={memo.data}
          showIcon={showIcon}
          showTitle={showTitle}
          showContent={showContent}
          {...props}
        />
      );
    } else if (memo.isLoading) {
      return <div>Loading...</div>;
    } else if (memo.isError) {
      return <div>{memo.error.message}</div>;
    } else {
      return <i>empty</i>;
    }
  },
);
