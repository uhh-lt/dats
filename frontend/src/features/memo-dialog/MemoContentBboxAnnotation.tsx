import React from "react";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { BBoxAnnotationReadResolvedCode, MemoRead } from "../../api/openapi";
import MemoHooks from "../../api/MemoHooks";
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
  const createMutation = BboxAnnotationHooks.useCreateMemo();
  const updateMutation = MemoHooks.useUpdateMemo();
  const deleteMutation = MemoHooks.useDeleteMemo();

  // form handling
  const handleCreateOrUpdateBboxAnnotationMemo = (data: any) => {
    if (!user.data) return;

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
              text: `Updated memo for bboxAnnotation ${memo.attached_object_id}`,
              severity: "success",
            });
            closeDialog();
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          bboxId: bboxAnnotation.id,
          requestBody: {
            user_id: user.data.id,
            project_id: bboxAnnotation.code.project_id,
            title: data.title,
            content: data.content,
          },
        },
        {
          onSuccess: () => {
            SnackbarAPI.openSnackbar({
              text: `Created memo for bboxAnnotation ${bboxAnnotation.id}`,
              severity: "success",
            });
            closeDialog();
          },
        }
      );
    }
  };
  const handleDeleteBboxAnnotationMemo = () => {
    if (memo) {
      deleteMutation.mutate(
        { memoId: memo.id },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: `Deleted memo for bboxAnnotation ${data.attached_object_id}`,
              severity: "success",
            });
            closeDialog();
          },
        }
      );
    } else {
      throw Error("Invalid invocation of handleDeleteBboxAnnotationMemo. No memo to delete.");
    }
  };

  return (
    <MemoForm
      title={`Memo for Image Annotation ${bboxAnnotation.id}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateBboxAnnotationMemo}
      handleDeleteMemo={handleDeleteBboxAnnotationMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
      isDeleteLoading={deleteMutation.isLoading}
    />
  );
}
