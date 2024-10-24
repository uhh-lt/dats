import { Box, CircularProgress, Divider, Stack, Toolbar, Typography } from "@mui/material";
import { useCallback } from "react";
import MemoHooks from "../../api/MemoHooks.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import { useAuth } from "../../auth/useAuth.ts";
import AttachedObjectLink from "../../views/logbook/AttachedObjectLink.tsx";
import EditableTypography from "../EditableTypography.tsx";
import UserName from "../User/UserName.tsx";
import MemoActionsMenu from "./MemoActionsMenu.tsx";
import MemoBlockEditorView from "./MemoBlockEditorView.tsx";
import useGetMemosAttachedObject from "./useGetMemosAttachedObject.ts";

interface MemoBlockEditorProps {
  memoId: number;
  renderToolbar?: (memo: MemoRead) => React.ReactNode;
  onDelete?: () => void;
  onStarred?: () => void;
}

function MemoBlockEditor({ memoId, renderToolbar, onDelete, onStarred }: MemoBlockEditorProps) {
  // global client state
  const { user } = useAuth();
  const memo = MemoHooks.useGetMemo(memoId);
  const attachedObject = useGetMemosAttachedObject(memo.data?.attached_object_type)(memo.data?.attached_object_id);

  const isEditable = user?.id === memo.data?.user_id;

  const { mutate: updateMemo } = MemoHooks.useUpdateMemo();
  const handleTitleChange = useCallback(
    (title: string) => {
      updateMemo({
        memoId: memoId,
        requestBody: {
          title: title,
        },
      });
    },
    [memoId, updateMemo],
  );

  return (
    <Box className="h100 myFlexContainer">
      {memo.isLoading || attachedObject.isLoading ? (
        <CircularProgress />
      ) : memo.isError ? (
        <div>Error: {memo.error.message}</div>
      ) : attachedObject.isError ? (
        <div>Error: {attachedObject.error.message}</div>
      ) : memo.isSuccess && attachedObject.isSuccess ? (
        <>
          <Stack direction="row" alignItems="center" justifyContent="space-between" p={0.5} gap={0.5}>
            <Typography fontWeight={900}>
              <AttachedObjectLink
                attachedObject={attachedObject.data}
                attachedObjectType={memo.data.attached_object_type}
              />
            </Typography>
            <Typography variant="subtitle2" color="textDisabled" fontSize={12} flexShrink={0}>
              <UserName userId={memo.data.user_id} />
            </Typography>
          </Stack>

          <Divider />
          <Toolbar disableGutters variant="dense" sx={{ justifyContent: "space-between" }}>
            {renderToolbar ? renderToolbar(memo.data) : null}
            {isEditable ? (
              <EditableTypography
                variant="h6"
                value={memo.data.title}
                onChange={handleTitleChange}
                whiteColor={false}
              />
            ) : (
              <Typography variant="h6">{memo.data.title}</Typography>
            )}
            <MemoActionsMenu memo={memo.data} onDeleteClick={onDelete} onStarredClick={onStarred} />
          </Toolbar>
          <Divider />
          <MemoBlockEditorView memo={memo.data} editable={isEditable} />
        </>
      ) : null}
    </Box>
  );
}

export default MemoBlockEditor;
