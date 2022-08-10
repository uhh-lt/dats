import React, { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { CodeRead, MemoRead } from "../../api/openapi";
import CodeHooks from "../../api/CodeHooks";
import MemoHooks from "../../api/MemoHooks";
import { QueryKey } from "../../api/QueryKey";
import { useAuth } from "../../auth/AuthProvider";
import { MemoForm } from "./MemoForm";

interface MemoContentCodeProps {
  code: CodeRead;
  memo: MemoRead | undefined;
}

export function MemoContentCode({ code, memo }: MemoContentCodeProps) {
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
    onError: onError,
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.MEMO_CODE, code.id]);
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Created memo for code ${code.name}`,
        severity: "success",
      });
    },
  });
  const updateMutation = MemoHooks.useUpdateMemo({
    onError: onError,
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      queryClient.invalidateQueries([QueryKey.MEMO_CODE, code.id]);
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Updated memo for code ${code.name}`,
        severity: "success",
      });
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
        codeId: code.id,
        requestBody: {
          title: data.title,
          content: data.content,
          user_id: 1,
          project_id: code.project_id,
        },
      });
    }
  };

  return (
    <MemoForm
      title={`Memo for code ${code.name}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateCodeMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
    />
  );
}
