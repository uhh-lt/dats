import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { BBoxAnnotationReadResolvedCode, MemoRead } from "../../api/openapi";
import MemoHooks from "../../api/MemoHooks";
import { QueryKey } from "../../api/QueryKey";
import { MemoForm } from "./MemoForm";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks";
import { useAuth } from "../../auth/AuthProvider";

export interface MemoContentProps {
  memo: MemoRead | undefined;
  closeDialog: () => void;
}

interface MemoContentBboxAnnotationProps {
  bboxAnnotation: BBoxAnnotationReadResolvedCode;
}

export function MemoContentBboxAnnotation({
  bboxAnnotation,
  memo,
  closeDialog,
}: MemoContentBboxAnnotationProps & MemoContentProps) {
  const { user } = useAuth();

  // mutations
  const queryClient = useQueryClient();
  const createMutation = BboxAnnotationHooks.useCreateMemo({
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Created memo for bboxAnnotation ${bboxAnnotation.id}`,
        severity: "success",
      });
      closeDialog();
    },
  });
  const updateMutation = MemoHooks.useUpdateMemo({
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      queryClient.invalidateQueries([QueryKey.MEMO_BBOX_ANNOTATION, bboxAnnotation.id, data.user_id]);
      SnackbarAPI.openSnackbar({
        text: `Updated memo for bboxAnnotation ${bboxAnnotation.id}`,
        severity: "success",
      });
      closeDialog();
    },
  });
  const deleteMutation = MemoHooks.useDeleteMemo({
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      queryClient.invalidateQueries([QueryKey.MEMO_BBOX_ANNOTATION, bboxAnnotation.id, data.user_id]);
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Deleted memo for bboxAnnotation ${bboxAnnotation.id}`,
        severity: "success",
      });
      closeDialog();
    },
  });

  // form handling
  const handleCreateOrUpdateBboxAnnotationMemo = (data: any) => {
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
        bboxId: bboxAnnotation.id,
        requestBody: {
          user_id: user.data.id,
          project_id: bboxAnnotation.code.project_id,
          title: data.title,
          content: data.content,
        },
      });
    }
  };
  const handleDeleteBboxAnnotationMemo = () => {
    if (memo) {
      deleteMutation.mutate({ memoId: memo.id });
    } else {
      throw Error("Invalid invocation of handleDeleteBboxAnnotationMemo. No memo to delete.");
    }
  };

  return (
    <MemoForm
      title={`Memo for bboxAnnotation ${bboxAnnotation.id}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateBboxAnnotationMemo}
      handleDeleteMemo={handleDeleteBboxAnnotationMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
      isDeleteLoading={deleteMutation.isLoading}
    />
  );
}
