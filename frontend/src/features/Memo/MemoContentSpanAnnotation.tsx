import React from "react";
import SnackbarAPI from "../Snackbar/SnackbarAPI";
import { SpanAnnotationReadResolved } from "../../api/openapi";
import MemoHooks from "../../api/MemoHooks";
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
  onMemoCreateSuccess,
}: MemoContentSpanAnnotationProps & MemoContentProps) {
  const { user } = useAuth();

  // mutations
  const createMutation = SpanAnnotationHooks.useCreateMemo();
  const updateMutation = MemoHooks.useUpdateMemo();
  const deleteMutation = MemoHooks.useDeleteMemo();

  // form handling
  const handleCreateOrUpdateSpanAnnotationMemo = (data: any) => {
    if (!user) return;

    if (memo) {
      updateMutation.mutate(
        {
          memoId: memo.id,
          requestBody: {
            title: data.title,
            content: data.content,
          },
        },
        {
          onSuccess: (memo) => {
            SnackbarAPI.openSnackbar({
              text: `Updated memo for spanAnnotation ${memo.attached_object_id}`,
              severity: "success",
            });
            closeDialog();
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          spanId: spanAnnotation.id,
          requestBody: {
            user_id: user.id,
            project_id: spanAnnotation.code.project_id,
            title: data.title,
            content: data.content,
          },
        },
        {
          onSuccess: (memo) => {
            SnackbarAPI.openSnackbar({
              text: `Created memo for spanAnnotation ${memo.attached_object_id}`,
              severity: "success",
            });
            if (onMemoCreateSuccess) onMemoCreateSuccess(memo);
            closeDialog();
          },
        },
      );
    }
  };
  const handleDeleteSpanAnnotationMemo = () => {
    if (memo) {
      deleteMutation.mutate(
        { memoId: memo.id },
        {
          onSuccess: (memo) => {
            SnackbarAPI.openSnackbar({
              text: `Deleted memo for spanAnnotation ${memo.attached_object_id}`,
              severity: "success",
            });
            closeDialog();
          },
        },
      );
    } else {
      throw Error("Invalid invocation of handleDeleteSpanAnnotationMemo. No memo to delete.");
    }
  };

  return (
    <MemoForm
      title={`Memo for Text Annotation '${spanAnnotation.span_text}'`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateSpanAnnotationMemo}
      handleDeleteMemo={handleDeleteSpanAnnotationMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
      isDeleteLoading={deleteMutation.isLoading}
    />
  );
}
