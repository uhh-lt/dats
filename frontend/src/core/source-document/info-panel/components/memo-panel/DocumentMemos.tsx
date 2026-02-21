import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { Box, Button, CircularProgress, IconButton, Stack } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { MemoHooks } from "../../../../../api/MemoHooks.ts";
import { AttachedObjectType } from "../../../../../api/openapi/models/AttachedObjectType.ts";
import { MemoRead } from "../../../../../api/openapi/models/MemoRead.ts";
import { useAuth } from "../../../../../features/auth/useAuth.ts";
import { Icon, getIconComponent } from "../../../../../utils/icons/iconUtils.tsx";
import { MemoEditor } from "../../../../memo/editor/MemoEditor.tsx";
import { MemoCard } from "../../../../memo/renderer/MemoCard.tsx";

interface DocumentMemosProps {
  sdocId: number;
}

export const DocumentMemos = memo(({ sdocId }: DocumentMemosProps) => {
  const [currentMemo, setCurrentMemo] = useState<number | undefined>(undefined);

  // actions
  const handleClickMemo = useCallback((memo: MemoRead) => {
    setCurrentMemo(memo.id);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentMemo(undefined);
  }, []);

  // rendering
  if (currentMemo !== undefined) {
    return (
      <MemoEditor
        memoId={currentMemo}
        onDelete={handleReset}
        renderToolbar={() => (
          <IconButton onClick={handleReset}>
            <ArrowBackIosNewIcon />
          </IconButton>
        )}
      />
    );
  } else {
    return <DocumentMemoList sdocId={sdocId} onClick={handleClickMemo} />;
  }
});

interface DocumentMemoListProps {
  sdocId: number;
  onClick: (memo: MemoRead) => void;
}

function DocumentMemoList({ sdocId, onClick }: DocumentMemoListProps) {
  const { user } = useAuth();
  const memos = MemoHooks.useGetObjectMemos(AttachedObjectType.SOURCE_DOCUMENT, sdocId);

  // mutations
  const { mutate: createMemoMutation, isPending } = MemoHooks.useCreateMemo();

  const handleAddMemo = useCallback(() => {
    if (!user) return;
    createMemoMutation({
      attachedObjectId: sdocId,
      attachedObjectType: AttachedObjectType.SOURCE_DOCUMENT,
      requestBody: {
        content: "",
        content_json: "",
        title: `${user.first_name} ${user.last_name}'s Memo`,
      },
    });
  }, [user, sdocId, createMemoMutation]);

  return (
    <Box p={1}>
      {memos.isLoading && (
        <Box textAlign={"center"} pt={2}>
          <CircularProgress />
        </Box>
      )}
      {memos.isError && <span>{memos.error.message}</span>}
      {memos.isSuccess && (
        <>
          {memos.data.filter((memo) => memo.user_id === user?.id).length === 0 && (
            <Button
              variant="text"
              size="small"
              startIcon={getIconComponent(Icon.ADD)}
              sx={{ mb: 1 }}
              onClick={handleAddMemo}
              disabled={!user || isPending}
            >
              Add Document Memo
            </Button>
          )}
          <Stack direction="column" spacing={2}>
            {memos.data
              .sort((a) => (a.user_id === user?.id ? -1 : 0)) // always show user's memos first
              .map((memo) => (
                <MemoCard memo={memo} key={memo.id} onClick={onClick} />
              ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
