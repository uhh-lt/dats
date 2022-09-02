import React, { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { DocumentTagRead } from "../../api/openapi";
import TagHooks from "../../api/TagHooks";
import MemoHooks from "../../api/MemoHooks";
import { QueryKey } from "../../api/QueryKey";
import { MemoForm } from "./MemoForm";
import { useAuth } from "../../auth/AuthProvider";
import { MemoContentProps } from "./MemoContentBboxAnnotation";

interface MemoContentTagProps {
  tag: DocumentTagRead;
}

export function MemoContentTag({ tag, memo, closeDialog }: MemoContentTagProps & MemoContentProps) {
  const { user } = useAuth();

  // mutations
  const queryClient = useQueryClient();
  const onError = useCallback((error: Error) => {
    SnackbarAPI.openSnackbar({
      text: error.message,
      severity: "error",
    });
  }, []);
  const createMutation = TagHooks.useCreateMemo({
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Created memo for tag ${tag.title}`,
        severity: "success",
      });
      closeDialog();
    },
  });
  const updateMutation = MemoHooks.useUpdateMemo({
    onError,
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      queryClient.invalidateQueries([QueryKey.MEMO_TAG, tag.id]);
      SnackbarAPI.openSnackbar({
        text: `Updated memo for tag ${tag.title}`,
        severity: "success",
      });
      closeDialog();
    },
  });
  const deleteMutation = MemoHooks.useDeleteMemo({
    onError,
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      queryClient.invalidateQueries([QueryKey.MEMO_TAG, tag.id]);
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Deleted memo for tag ${tag.title}`,
        severity: "success",
      });
      closeDialog();
    },
  });

  // form handling
  const handleCreateOrUpdateCodeMemo = (data: any) => {
    if (memo) {
      updateMutation.mutate({
        memoId: memo.id,
        requestBody: {
          title: data.title,
          content: data.content,
        },
      });
    } else {
      createMutation.mutate({
        tagId: tag.id,
        requestBody: {
          user_id: 1,
          project_id: tag.project_id,
          title: data.title,
          content: data.content,
        },
      });
    }
  };
  const handleDeleteTagMemo = () => {
    if (memo) {
      deleteMutation.mutate({ memoId: memo.id });
    } else {
      throw Error("Invalid invocation of handleDeleteTagMemo. No memo to delete.");
    }
  };

  return (
    <MemoForm
      title={`Memo for tag ${tag.title}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateCodeMemo}
      handleDeleteMemo={handleDeleteTagMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
      isDeleteLoading={deleteMutation.isLoading}
    />
  );
}
