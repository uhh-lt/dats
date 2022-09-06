import React, { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { SourceDocumentRead } from "../../api/openapi";
import SdocHooks from "../../api/SdocHooks";
import MemoHooks from "../../api/MemoHooks";
import { QueryKey } from "../../api/QueryKey";
import { useAuth } from "../../auth/AuthProvider";
import { MemoForm } from "./MemoForm";
import { MemoContentProps } from "./MemoContentBboxAnnotation";

interface MemoContentSourceDocumentProps {
  sdoc: SourceDocumentRead;
}

export function MemoContentSourceDocument({
  sdoc,
  memo,
  closeDialog,
}: MemoContentSourceDocumentProps & MemoContentProps) {
  const { user } = useAuth();

  // mutations
  const queryClient = useQueryClient();
  const onError = useCallback((error: Error) => {
    SnackbarAPI.openSnackbar({
      text: error.message,
      severity: "error",
    });
  }, []);
  const createMutation = SdocHooks.useCreateMemo({
    onError,
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Created memo for source document ${sdoc.filename}`,
        severity: "success",
      });
      closeDialog();
    },
  });
  const updateMutation = MemoHooks.useUpdateMemo({
    onError,
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      queryClient.invalidateQueries([QueryKey.MEMO_SDOC, sdoc.id, data.user_id]);
      SnackbarAPI.openSnackbar({
        text: `Updated memo for source document ${sdoc.filename}`,
        severity: "success",
      });
      closeDialog();
    },
  });
  const deleteMutation = MemoHooks.useDeleteMemo({
    onError,
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      queryClient.invalidateQueries([QueryKey.MEMO_SDOC, sdoc.id, data.user_id]);
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Deleted memo for source document ${sdoc.filename}`,
        severity: "success",
      });
      closeDialog();
    },
  });

  // form handling
  const handleCreateOrUpdateCodeMemo = (data: any) => {
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
        sdocId: sdoc.id,
        requestBody: {
          user_id: user.data.id,
          project_id: sdoc.project_id,
          title: data.title,
          content: data.content,
        },
      });
    }
  };
  const handleDeleteSdocMemo = () => {
    if (memo) {
      deleteMutation.mutate({ memoId: memo.id });
    } else {
      throw Error("Invalid invocation of handleDeleteSdocMemo. No memo to delete.");
    }
  };

  return (
    <MemoForm
      title={`Memo for Source Document ${sdoc.filename}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateCodeMemo}
      handleDeleteMemo={handleDeleteSdocMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
      isDeleteLoading={deleteMutation.isLoading}
    />
  );
}
