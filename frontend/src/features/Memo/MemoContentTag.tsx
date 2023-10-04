import React from "react";
import SnackbarAPI from "../Snackbar/SnackbarAPI";
import { DocumentTagRead } from "../../api/openapi";
import TagHooks from "../../api/TagHooks";
import MemoHooks from "../../api/MemoHooks";
import { MemoForm } from "./MemoForm";
import { useAuth } from "../../auth/AuthProvider";
import { MemoContentProps } from "./MemoContentBboxAnnotation";

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
  const handleCreateOrUpdateCodeMemo = (data: any) => {
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
          onSuccess: () => {
            SnackbarAPI.openSnackbar({
              text: `Updated memo for tag ${tag.title}`,
              severity: "success",
            });
            closeDialog();
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          tagId: tag.id,
          requestBody: {
            user_id: user.data.id,
            project_id: tag.project_id,
            title: data.title,
            content: data.content,
          },
        },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: `Created memo for tag ${tag.title}`,
              severity: "success",
            });
            if (onMemoCreateSuccess) onMemoCreateSuccess(data);
            closeDialog();
          },
        }
      );
    }
  };
  const handleDeleteTagMemo = () => {
    if (memo) {
      deleteMutation.mutate(
        { memoId: memo.id },
        {
          onSuccess: () => {
            SnackbarAPI.openSnackbar({
              text: `Deleted memo for tag ${tag.title}`,
              severity: "success",
            });
            closeDialog();
          },
        }
      );
    } else {
      throw Error("Invalid invocation of handleDeleteTagMemo. No memo to delete.");
    }
  };

  return (
    <MemoForm
      title={`Memo for tag ${tag.title}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateCodeMemo}
      handleDeleteMemo={handleDeleteTagMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
      isDeleteLoading={deleteMutation.isLoading}
    />
  );
}
