import { StackProps } from "@mui/material";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { MemoRendererSharedProps, MemoRendererWithData } from "./MemoRenderer.tsx";
import { useGetMemoQuery } from "./useGetMemoQuery.ts";

interface MemoRenderer2Props {
  attachedObjectType: AttachedObjectType;
  attachedObjectId: number;
  userId: number;
}

function MemoRenderer2({
  attachedObjectType,
  attachedObjectId,
  userId,
  showIcon: icon = true,
  showTitle: title = true,
  showContent: content = false,
  ...props
}: MemoRenderer2Props & MemoRendererSharedProps & StackProps) {
  const memo = useGetMemoQuery(attachedObjectType)(attachedObjectId, userId);

  if (memo.isSuccess && memo.data !== null && memo.data !== undefined) {
    return <MemoRendererWithData memo={memo.data} showIcon={icon} showTitle={title} showContent={content} {...props} />;
  } else if (memo.isLoading) {
    return <div>Loading...</div>;
  } else if (memo.isError) {
    return <div>{memo.error.message}</div>;
  } else {
    return <i>empty</i>;
  }
}

export default MemoRenderer2;
