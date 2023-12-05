import React from "react";
import SnackbarAPI from "../Snackbar/SnackbarAPI";
import { SourceDocumentRead } from "../../api/openapi";
import SdocHooks from "../../api/SdocHooks";
import MemoHooks from "../../api/MemoHooks";
import { useAuth } from "../../auth/AuthProvider";
import { MemoForm } from "./MemoForm";
import { MemoContentProps } from "./MemoContentBboxAnnotation";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI";

interface MemoContentSourceDocumentProps {
  sdoc: SourceDocumentRead;
}

export function MemoContentSourceDocument({
  sdoc,
  memo,
  closeDialog,
  onMemoCreateSuccess,
}: MemoContentSourceDocumentProps & MemoContentProps) {
  const { user } = useAuth();

  // mutations
  const createMutation = SdocHooks.useCreateMemo();
  const updateMutation = MemoHooks.useUpdateMemo();
  const deleteMutation = MemoHooks.useDeleteMemo();

  // form handling
  const handleCreateOrUpdateCodeMemo = (data: any) => {
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
              text: `Updated memo for source document ${sdoc.filename}`,
              severity: "success",
            });
            closeDialog();
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          sdocId: sdoc.id,
          requestBody: {
            user_id: user.id,
            project_id: sdoc.project_id,
            title: data.title,
            content: data.content,
          },
        },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: `Created memo for source document ${sdoc.filename}`,
              severity: "success",
            });
            if (onMemoCreateSuccess) onMemoCreateSuccess(data);
            closeDialog();
          },
        },
      );
    }
  };
  const handleDeleteSdocMemo = () => {
    if (memo) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to remove SourceDocument Memo "${memo.title}"? This action cannot be undone!`,
        onAccept: () => {
          deleteMutation.mutate(
            { memoId: memo.id },
            {
              onSuccess: () => {
                SnackbarAPI.openSnackbar({
                  text: `Deleted memo for source document ${sdoc.filename}`,
                  severity: "success",
                });
                closeDialog();
              },
            },
          );
        },
      });
    } else {
      throw Error("Invalid invocation of handleDeleteSdocMemo. No memo to delete.");
    }
  };

  return (
    <MemoForm
      title={`Memo for Document ${sdoc.filename}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateCodeMemo}
      handleDeleteMemo={handleDeleteSdocMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
      isDeleteLoading={deleteMutation.isLoading}
    />
  );
}
