import { SubmitHandler } from "react-hook-form";
import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks.ts";
import MemoHooks from "../../../api/MemoHooks.ts";
import { BBoxAnnotationReadResolved } from "../../../api/openapi/models/BBoxAnnotationReadResolved.ts";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import ConfirmationAPI from "../../ConfirmationDialog/ConfirmationAPI.ts";
import { MemoCreateSuccessHandler } from "./MemoDialogAPI.ts";
import { MemoForm, MemoFormValues } from "./MemoForm.tsx";

export interface MemoContentProps {
  memo: MemoRead | undefined;
  onMemoCreateSuccess?: MemoCreateSuccessHandler;
  closeDialog: () => void;
}

interface MemoContentBboxAnnotationProps {
  bboxAnnotation: BBoxAnnotationReadResolved;
}

export function MemoContentBboxAnnotation({
  bboxAnnotation,
  memo,
  closeDialog,
  onMemoCreateSuccess,
}: MemoContentBboxAnnotationProps & MemoContentProps) {
  // mutations
  const createMutation = BboxAnnotationHooks.useCreateMemo();
  const updateMutation = MemoHooks.useUpdateMemo();
  const deleteMutation = MemoHooks.useDeleteMemo();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // form handling
  const handleCreateOrUpdateBboxAnnotationMemo: SubmitHandler<MemoFormValues> = (data) => {
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
            openSnackbar({
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
            title: data.title,
            content: data.content,
            content_json: "",
          },
        },
        {
          onSuccess: (data) => {
            openSnackbar({
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
                openSnackbar({
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
      key={memo?.id}
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
