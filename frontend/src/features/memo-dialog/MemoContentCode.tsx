import React, { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { CodeRead } from "../../api/openapi";
import CodeHooks from "../../api/CodeHooks";
import MemoHooks from "../../api/MemoHooks";
import { QueryKey } from "../../api/QueryKey";
import { useAuth } from "../../auth/AuthProvider";
import { MemoForm } from "./MemoForm";
import { MemoContentProps } from "./MemoContentBboxAnnotation";

interface MemoContentCodeProps {
  code: CodeRead;
}

export function MemoContentCode({ code, memo, closeDialog }: MemoContentCodeProps & MemoContentProps) {
  const { user } = useAuth();

  // mutations
  const queryClient = useQueryClient();
  const onError = useCallback((error: Error) => {
    SnackbarAPI.openSnackbar({
      text: error.message,
      severity: "error",
    });
  }, []);
  const createMutation = CodeHooks.useCreateMemo({
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Created memo for code ${code.name}`,
        severity: "success",
      });
      closeDialog();
    },
  });
  const updateMutation = MemoHooks.useUpdateMemo({
    onError,
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      queryClient.invalidateQueries([QueryKey.MEMO_CODE, code.id, data.user_id]);
      SnackbarAPI.openSnackbar({
        text: `Updated memo for code ${code.name}`,
        severity: "success",
      });
      closeDialog();
    },
  });
  const deleteMutation = MemoHooks.useDeleteMemo({
    onError,
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      queryClient.invalidateQueries([QueryKey.MEMO_CODE, code.id, data.user_id]);
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Deleted memo for code ${code.id}`,
        severity: "success",
      });
      closeDialog();
    },
  });

  // form handling
  const handleCreateOrUpdateCodeMemo = (data: any) => {
    if (!user.data) return;

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
        codeId: code.id,
        requestBody: {
          title: data.title,
          content: data.content,
          user_id: user.data.id,
          project_id: code.project_id,
        },
      });
    }
  };
  const handleDeleteCodeMemo = () => {
    if (memo) {
      deleteMutation.mutate({ memoId: memo.id });
    } else {
      throw Error("Invalid invocation of handleDeleteCodeMemo. No memo to delete.");
    }
  };

  return (
    <MemoForm
      title={`Memo for code ${code.name}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateCodeMemo}
      handleDeleteMemo={handleDeleteCodeMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
      isDeleteLoading={deleteMutation.isLoading}
    />
  );
}
