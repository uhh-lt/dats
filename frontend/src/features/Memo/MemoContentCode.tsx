import React from "react";
import SnackbarAPI from "../Snackbar/SnackbarAPI";
import { CodeRead } from "../../api/openapi";
import CodeHooks from "../../api/CodeHooks";
import MemoHooks from "../../api/MemoHooks";
import { useAuth } from "../../auth/AuthProvider";
import { MemoForm } from "./MemoForm";
import { MemoContentProps } from "./MemoContentBboxAnnotation";

interface MemoContentCodeProps {
  code: CodeRead;
}

export function MemoContentCode({
  code,
  memo,
  closeDialog,
  onMemoCreateSuccess,
}: MemoContentCodeProps & MemoContentProps) {
  const { user } = useAuth();

  // mutations
  const createMutation = CodeHooks.useCreateMemo();
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
              text: `Updated memo for code ${code.name}`,
              severity: "success",
            });
            closeDialog();
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          codeId: code.id,
          requestBody: {
            title: data.title,
            content: data.content,
            user_id: user.data.id,
            project_id: code.project_id,
          },
        },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: `Created memo for code ${code.name}`,
              severity: "success",
            });
            if (onMemoCreateSuccess) onMemoCreateSuccess(data);
            closeDialog();
          },
        }
      );
    }
  };
  const handleDeleteCodeMemo = () => {
    if (memo) {
      deleteMutation.mutate(
        { memoId: memo.id },
        {
          onSuccess: () => {
            SnackbarAPI.openSnackbar({
              text: `Deleted memo for code ${code.name}`,
              severity: "success",
            });
            closeDialog();
          },
        }
      );
    } else {
      throw Error("Invalid invocation of handleDeleteCodeMemo. No memo to delete.");
    }
  };

  return (
    <MemoForm
      title={`Memo for code ${code.name}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateCodeMemo}
      handleDeleteMemo={handleDeleteCodeMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
      isDeleteLoading={deleteMutation.isLoading}
    />
  );
}
