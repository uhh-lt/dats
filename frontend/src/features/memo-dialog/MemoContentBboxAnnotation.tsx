import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { BBoxAnnotationReadResolvedCode, MemoRead } from "../../api/openapi";
import MemoHooks from "../../api/MemoHooks";
import { QueryKey } from "../../api/QueryKey";
import { MemoForm } from "./MemoForm";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks";

interface MemoContentBboxAnnotationProps {
  bboxAnnotation: BBoxAnnotationReadResolvedCode;
  memo: MemoRead | undefined;
}

export function MemoContentBboxAnnotation({ bboxAnnotation, memo }: MemoContentBboxAnnotationProps) {
  // mutations
  const queryClient = useQueryClient();
  const createMutation = BboxAnnotationHooks.useCreateMemo({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.MEMO_SPAN_ANNOTATION, bboxAnnotation.id]);
      SnackbarAPI.openSnackbar({
        text: `Created memo for bboxAnnotation ${bboxAnnotation.id}`,
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
      queryClient.invalidateQueries([QueryKey.MEMO_SPAN_ANNOTATION, bboxAnnotation.id]);
      SnackbarAPI.openSnackbar({
        text: `Updated memo for bboxAnnotation ${bboxAnnotation.id}`,
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
        bboxId: bboxAnnotation.id,
        requestBody: {
          user_id: 1,
          project_id: bboxAnnotation.code.project_id,
          title: data.title,
          content: data.content,
        },
      });
    }
  };

  return (
    <MemoForm
      title={`Memo for bboxAnnotation ${bboxAnnotation.id}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateSpanAnnotationMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
    />
  );
}
