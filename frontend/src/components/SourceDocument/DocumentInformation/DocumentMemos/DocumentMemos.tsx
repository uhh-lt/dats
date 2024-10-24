import AddCircleIcon from "@mui/icons-material/AddCircle";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { Box, Button, CircularProgress, IconButton, Stack } from "@mui/material";
import { useState } from "react";
import SdocHooks from "../../../../api/SdocHooks.ts";
import { useAuth } from "../../../../auth/useAuth.ts";
import MemoBlockEditor from "../../../Memo/MemoBlockEditor.tsx";
import MemoCard from "./MemoCard.tsx";

interface DocumentMemosProps {
  sdocId: number;
}

function DocumentMemos({ sdocId }: DocumentMemosProps) {
  const [currentMemo, setCurrentMemo] = useState<number | undefined>(undefined);

  // actions
  const handleClickMemo = (memoId: number) => {
    setCurrentMemo(memoId);
  };
  const handleReset = () => {
    setCurrentMemo(undefined);
  };

  // rendering
  if (currentMemo !== undefined) {
    return (
      <MemoBlockEditor
        memoId={currentMemo}
        onDelete={handleReset}
        renderToolbar={() => (
          <IconButton onClick={handleReset} size="small">
            <ArrowBackIosNewIcon />
          </IconButton>
        )}
      />
    );
  } else {
    return <DocumentMemoList sdocId={sdocId} onClick={handleClickMemo} />;
  }
}

function DocumentMemoList({ sdocId, onClick }: { sdocId: number; onClick: (memoId: number) => void }) {
  const { user } = useAuth();
  const memos = SdocHooks.useGetMemos(sdocId);

  // create memo
  const { mutate: createMemo, isPending } = SdocHooks.useCreateMemo();
  const handleAddMemo = () => {
    if (!user) return;

    createMemo({
      sdocId: sdocId,
      requestBody: {
        content: "",
        content_json: "",
        title: `${user.first_name} ${user.last_name}'s Memo`,
      },
    });
  };

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
              startIcon={<AddCircleIcon />}
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
                <MemoCard memo={memo} key={memo.id} onClick={(memo) => onClick(memo.id)} />
              ))}
          </Stack>
        </>
      )}
    </Box>
  );
}

export default DocumentMemos;
