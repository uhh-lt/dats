import { SubmitHandler } from "react-hook-form";
import MemoHooks from "../../../api/MemoHooks.ts";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks.ts";
import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import ConfirmationAPI from "../../ConfirmationDialog/ConfirmationAPI.ts";
import { MemoContentProps } from "./MemoContentBboxAnnotation.tsx";
import { MemoForm, MemoFormValues } from "./MemoForm.tsx";

interface MemoContentSpanAnnotationProps {
  spanAnnotation: SpanAnnotationReadResolved;
}

export function MemoContentSpanAnnotation({
  spanAnnotation,
  memo,
  closeDialog,
  onMemoCreateSuccess,
}: MemoContentSpanAnnotationProps & MemoContentProps) {
  // mutations
  const createMutation = SpanAnnotationHooks.useCreateMemo();
  const updateMutation = MemoHooks.useUpdateMemo();
  const deleteMutation = MemoHooks.useDeleteMemo();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // form handling
  const handleCreateOrUpdateSpanAnnotationMemo: SubmitHandler<MemoFormValues> = (data) => {
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
            title: data.title,
            content: data.content,
          },
        },
        {
          onSuccess: (memo) => {
            openSnackbar({
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
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to remove the SpanAnnotation Memo "${memo.title}"? This action cannot be undone!`,
        onAccept: () => {
          deleteMutation.mutate(
            { memoId: memo.id },
            {
              onSuccess: (memo) => {
                openSnackbar({
                  text: `Deleted memo for spanAnnotation ${memo.attached_object_id}`,
                  severity: "success",
                });
                closeDialog();
              },
            },
          );
        },
      });
    } else {
      throw Error("Invalid invocation of handleDeleteSpanAnnotationMemo. No memo to delete.");
    }
  };

  return (
    <MemoForm
      key={memo?.id}
      title={`Memo for Text Annotation '${spanAnnotation.text}'`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateSpanAnnotationMemo}
      handleDeleteMemo={handleDeleteSpanAnnotationMemo}
      isUpdateLoading={updateMutation.isPending}
      isCreateLoading={createMutation.isPending}
      isDeleteLoading={deleteMutation.isPending}
    />
  );
}
