import { Box, CircularProgress, Divider, Stack, Toolbar, Typography } from "@mui/material";
import { memo, useCallback, useMemo } from "react";
import { MemoHooks } from "../../../api/MemoHooks.ts";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import { EditableTypography } from "../../../components/EditableTypography.tsx";
import { useAuth } from "../../../features/auth/useAuth.ts";
import { dateToLocaleString } from "../../../utils/DateUtils.ts";
import { UserRenderer } from "../../user/renderer/UserRenderer.tsx";
import { AttachedObjectRenderer } from "../renderer";
import { useGetMemosAttachedObject } from "../utils/useGetMemosAttachedObject.ts";
import { MemoEditorView } from "./MemoEditorView.tsx";

interface MemoBlockEditorProps {
  memoId: number;
  renderToolbar?: (memo: MemoRead) => React.ReactNode;
  onDelete?: () => void;
  onStarred?: () => void;
}

export const MemoEditor = memo(({ memoId, renderToolbar, onDelete, onStarred }: MemoBlockEditorProps) => {
  // global client state
  const { user } = useAuth();
  const memo = MemoHooks.useGetMemo(memoId);
  const attachedObject = useGetMemosAttachedObject(memo.data?.attached_object_type, memo.data?.attached_object_id);

  const isEditable = useMemo(() => user?.id === memo.data?.user_id, [user?.id, memo.data?.user_id]);

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

  const handleMemoChange = useCallback(
    (markdown: string, json: string) => {
      updateMemo({
        memoId: memoId,
        requestBody: {
          content: markdown,
          content_json: json,
        },
      });
    },
    [memoId, updateMemo],
  );

  const lastModifiedDate = useMemo(() => {
    if (!memo.data?.updated) return "";
    const fullDate = dateToLocaleString(memo.data.updated);
    return fullDate.substring(0, fullDate.indexOf(","));
  }, [memo.data?.updated]);

  return (
    <Box className="h100 myFlexContainer">
      {memo.isLoading || attachedObject.isLoading ? (
        <CircularProgress />
      ) : memo.isError ? (
        <div>Error: {memo.error.message}</div>
      ) : attachedObject.isError ? (
        <div>Error: {attachedObject.error?.message}</div>
      ) : memo.isSuccess && attachedObject.isSuccess && attachedObject.data ? (
        <>
          <Stack direction="row" alignItems="center" justifyContent="space-between" p={0.5}>
            <Typography>
              <AttachedObjectRenderer
                attachedObject={attachedObject.data}
                attachedObjectType={memo.data.attached_object_type}
                link
              />
            </Typography>
            <Typography variant="subtitle2" color="textDisabled" fontSize={12} flexShrink={0}>
              <UserRenderer user={memo.data.user_id} />
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
            <MemoActionMenu memo={memo.data} onDeleteClick={onDelete} onStarredClick={onStarred} />
          </Toolbar>
          <Divider />
          <MemoEditorView
            initialContentJson={memo.data.content_json}
            onChange={handleMemoChange}
            editable={isEditable}
          />
          <Typography variant="subtitle2" color="textSecondary" fontSize={12} px={1}>
            {"Last modified: " + lastModifiedDate}
          </Typography>
        </>
      ) : null}
    </Box>
  );
});
