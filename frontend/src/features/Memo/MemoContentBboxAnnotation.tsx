import { SubmitHandler } from "react-hook-form";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks.ts";
import MemoHooks from "../../api/MemoHooks.ts";
import { BBoxAnnotationReadResolvedCode } from "../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import { useAuth } from "../../auth/useAuth.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";
import SnackbarAPI from "../Snackbar/SnackbarAPI.ts";
import { MemoCreateSuccessHandler } from "./MemoAPI.ts";
import { MemoForm, MemoFormValues } from "./MemoForm.tsx";

export interface MemoContentProps {
  memo: MemoRead | undefined;
  onMemoCreateSuccess?: MemoCreateSuccessHandler;
  closeDialog: () => void;
}

interface MemoContentBboxAnnotationProps {
  bboxAnnotation: BBoxAnnotationReadResolvedCode;
}

export function MemoContentBboxAnnotation({
  bboxAnnotation,
  memo,
  closeDialog,
  onMemoCreateSuccess,
}: MemoContentBboxAnnotationProps & MemoContentProps) {
  const { user } = useAuth();

  // mutations
  const createMutation = BboxAnnotationHooks.useCreateMemo();
  const updateMutation = MemoHooks.useUpdateMemo();
  const deleteMutation = MemoHooks.useDeleteMemo();

  // form handling
  const handleCreateOrUpdateBboxAnnotationMemo: SubmitHandler<MemoFormValues> = (data) => {
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
              text: `Updated memo for bboxAnnotation ${memo.attached_object_id}`,
              severity: "success",
            });
            closeDialog();
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          bboxId: bboxAnnotation.id,
          requestBody: {
            user_id: user.id,
            project_id: bboxAnnotation.code.project_id,
            title: data.title,
            content: data.content,
          },
        },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: `Created memo for bboxAnnotation ${bboxAnnotation.id}`,
              severity: "success",
            });
            if (onMemoCreateSuccess) onMemoCreateSuccess(data);
            closeDialog();
          },
        },
      );
    }
  };
  const handleDeleteBboxAnnotationMemo = () => {
    if (memo) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to remove the BBoxAnnotation Memo "${memo.title}"? This action cannot be undone!`,
        onAccept: () => {
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
            },
          );
        },
      });
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
      isUpdateLoading={updateMutation.isPending}
      isCreateLoading={createMutation.isPending}
      isDeleteLoading={deleteMutation.isPending}
    />
  );
}
