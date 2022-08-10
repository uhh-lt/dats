import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { MemoRead, SpanAnnotationReadResolved } from "../../api/openapi";
import MemoHooks from "../../api/MemoHooks";
import { QueryKey } from "../../api/QueryKey";
import { MemoForm } from "./MemoForm";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks";

interface MemoContentSpanAnnotationProps {
  spanAnnotation: SpanAnnotationReadResolved;
  memo: MemoRead | undefined;
}

export function MemoContentSpanAnnotation({ spanAnnotation, memo }: MemoContentSpanAnnotationProps) {
  // mutations
  const queryClient = useQueryClient();
  const createMutation = SpanAnnotationHooks.useCreateMemo({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.MEMO_SPAN_ANNOTATION, spanAnnotation.id]);
      SnackbarAPI.openSnackbar({
        text: `Created memo for spanAnnotation ${spanAnnotation.id}`,
        severity: "success",
      });
    },
  });
  const updateMutation = MemoHooks.useUpdateMemo({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.MEMO_SPAN_ANNOTATION, spanAnnotation.id]);
      SnackbarAPI.openSnackbar({
        text: `Updated memo for spanAnnotation ${spanAnnotation.id}`,
        severity: "success",
      });
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

  return (
    <MemoForm
      title={`Memo for spanAnnotation ${spanAnnotation.id}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateSpanAnnotationMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
    />
  );
}
