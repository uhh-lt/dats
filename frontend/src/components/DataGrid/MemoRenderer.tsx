import CommentIcon from "@mui/icons-material/Comment";
import { Stack } from "@mui/material";
import MemoHooks from "../../api/MemoHooks";
import { MemoRead } from "../../api/openapi";

interface MemoRendererProps {
  memo: number | MemoRead;
}

function MemoRenderer({ memo }: MemoRendererProps) {
  if (typeof memo === "number") {
    return <MemoRendererWithoutData memoId={memo} />;
  } else {
    return <MemoRendererWithData memo={memo} />;
  }
}

function MemoRendererWithoutData({ memoId }: { memoId: number }) {
  const memo = MemoHooks.useGetMemo(memoId);

  if (memo.isSuccess) {
    return <MemoRendererWithData memo={memo.data} />;
  } else if (memo.isError) {
    return <div>{memo.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function MemoRendererWithData({ memo }: { memo: MemoRead }) {
  return (
    <Stack direction="row" alignItems="center">
      <CommentIcon sx={{ mr: 1 }} />
      {memo.title}
    </Stack>
  );
}

export default MemoRenderer;
