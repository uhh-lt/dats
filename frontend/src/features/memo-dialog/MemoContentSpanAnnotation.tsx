import React, { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { SpanAnnotationReadResolved } from "../../api/openapi";
import MemoHooks from "../../api/MemoHooks";
import { QueryKey } from "../../api/QueryKey";
import { MemoForm } from "./MemoForm";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks";
import { useAuth } from "../../auth/AuthProvider";
import { MemoContentProps } from "./MemoContentBboxAnnotation";

interface MemoContentSpanAnnotationProps {
  spanAnnotation: SpanAnnotationReadResolved;
}

export function MemoContentSpanAnnotation({
  spanAnnotation,
  memo,
  closeDialog,
}: MemoContentSpanAnnotationProps & MemoContentProps) {
  const { user } = useAuth();

  // mutations
  const queryClient = useQueryClient();
  const onError = useCallback((error: Error) => {
    SnackbarAPI.openSnackbar({
      text: error.message,
      severity: "error",
    });
  }, []);
  const createMutation = SpanAnnotationHooks.useCreateMemo({
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Created memo for spanAnnotation ${spanAnnotation.id}`,
        severity: "success",
      });
      closeDialog();
    },
  });
  const updateMutation = MemoHooks.useUpdateMemo({
    onError,
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      queryClient.invalidateQueries([QueryKey.MEMO_SPAN_ANNOTATION, spanAnnotation.id]);
      SnackbarAPI.openSnackbar({
        text: `Updated memo for spanAnnotation ${spanAnnotation.id}`,
        severity: "success",
      });
      closeDialog();
    },
  });
  const deleteMutation = MemoHooks.useDeleteMemo({
    onError,
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      queryClient.invalidateQueries([QueryKey.MEMO_SPAN_ANNOTATION, spanAnnotation.id]);
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Deleted memo for spanAnnotation ${spanAnnotation.id}`,
        severity: "success",
      });
      closeDialog();
    },
  });

  // form handling
  const handleCreateOrUpdateSpanAnnotationMemo = (data: any) => {
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
        spanId: spanAnnotation.id,
        requestBody: {
          user_id: 1,
          project_id: spanAnnotation.code.project_id,
          title: data.title,
          content: data.content,
        },
      });
    }
  };
  const handleDeleteSpanAnnotationMemo = () => {
    if (memo) {
      deleteMutation.mutate({ memoId: memo.id });
    } else {
      throw Error("Invalid invocation of handleDeleteSpanAnnotationMemo. No memo to delete.");
    }
  };

  return (
    <MemoForm
      title={`Memo for spanAnnotation ${spanAnnotation.id}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateSpanAnnotationMemo}
      handleDeleteMemo={handleDeleteSpanAnnotationMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
      isDeleteLoading={deleteMutation.isLoading}
    />
  );
}
