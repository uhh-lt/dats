import { SubmitHandler } from "react-hook-form";
import MemoHooks from "../../api/MemoHooks.ts";
import TagHooks from "../../api/TagHooks.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { useAuth } from "../../auth/useAuth.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";
import SnackbarAPI from "../Snackbar/SnackbarAPI.ts";
import { MemoContentProps } from "./MemoContentBboxAnnotation.tsx";
import { MemoForm, MemoFormValues } from "./MemoForm.tsx";

interface MemoContentTagProps {
  tag: DocumentTagRead;
}

export function MemoContentTag({
  tag,
  memo,
  closeDialog,
  onMemoCreateSuccess,
}: MemoContentTagProps & MemoContentProps) {
  const { user } = useAuth();

  // mutations
  const createMutation = TagHooks.useCreateMemo();
  const updateMutation = MemoHooks.useUpdateMemo();
  const deleteMutation = MemoHooks.useDeleteMemo();

  // form handling
  const handleCreateOrUpdateCodeMemo: SubmitHandler<MemoFormValues> = (data) => {
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
          onSuccess: () => {
            SnackbarAPI.openSnackbar({
              text: `Updated memo for tag ${tag.name}`,
              severity: "success",
            });
            closeDialog();
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          tagId: tag.id,
          requestBody: {
            user_id: user.id,
            project_id: tag.project_id,
            title: data.title,
            content: data.content,
          },
        },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: `Created memo for tag ${tag.name}`,
              severity: "success",
            });
            if (onMemoCreateSuccess) onMemoCreateSuccess(data);
            closeDialog();
          },
        },
      );
    }
  };
  const handleDeleteTagMemo = () => {
    if (memo) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to remove the DocumentTag Memo "${memo.title}"? This action cannot be undone!`,
        onAccept: () => {
          deleteMutation.mutate(
            { memoId: memo.id },
            {
              onSuccess: () => {
                SnackbarAPI.openSnackbar({
                  text: `Deleted memo for tag ${tag.name}`,
                  severity: "success",
                });
                closeDialog();
              },
            },
          );
        },
      });
    } else {
      throw Error("Invalid invocation of handleDeleteTagMemo. No memo to delete.");
    }
  };

  return (
    <MemoForm
      title={`Memo for tag ${tag.name}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateCodeMemo}
      handleDeleteMemo={handleDeleteTagMemo}
      isUpdateLoading={updateMutation.isPending}
      isCreateLoading={createMutation.isPending}
      isDeleteLoading={deleteMutation.isPending}
    />
  );
}
