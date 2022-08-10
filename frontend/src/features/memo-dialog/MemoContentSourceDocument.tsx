import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { MemoRead, SourceDocumentRead } from "../../api/openapi";
import SdocHooks from "../../api/SdocHooks";
import MemoHooks from "../../api/MemoHooks";
import { QueryKey } from "../../api/QueryKey";
import { useAuth } from "../../auth/AuthProvider";
import { MemoForm } from "./MemoForm";

interface MemoContentSourceDocumentProps {
  sdoc: SourceDocumentRead;
  memo: MemoRead | undefined;
}

export function MemoContentSourceDocument({ sdoc, memo }: MemoContentSourceDocumentProps) {
  const { user } = useAuth();

  // mutations
  const queryClient = useQueryClient();
  const createMutation = SdocHooks.useCreateMemo({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.MEMO_SDOC, sdoc.id]);
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Created memo for source document ${sdoc.filename}`,
        severity: "success",
      });
    },
  });
  const updateMutation = MemoHooks.useUpdateMemo({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      queryClient.invalidateQueries([QueryKey.MEMO_SDOC, sdoc.id]);
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, user.data?.id]);
      SnackbarAPI.openSnackbar({
        text: `Updated memo for source document ${sdoc.filename}`,
        severity: "success",
      });
    },
  });

  // form handling
  const handleCreateOrUpdateCodeMemo = (data: any) => {
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
          user_id: 1,
          project_id: sdoc.project_id,
          title: data.title,
          content: data.content,
        },
      });
    }
  };

  return (
    <MemoForm
      title={`Memo for Source Document ${sdoc.filename}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateCodeMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
    />
  );
}
