import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { DocumentTagRead, MemoRead } from "../../api/openapi";
import TagHooks from "../../api/TagHooks";
import MemoHooks from "../../api/MemoHooks";
import { QueryKey } from "../../api/QueryKey";
import { MemoForm } from "./MemoForm";

interface MemoContentTagProps {
  tag: DocumentTagRead;
  memo: MemoRead | undefined;
}

export function MemoContentTag({ tag, memo }: MemoContentTagProps) {
  // mutations
  const queryClient = useQueryClient();
  const createMutation = TagHooks.useCreateMemo({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.MEMO_TAG, tag.id]);
      SnackbarAPI.openSnackbar({
        text: `Created memo for tag ${tag.title}`,
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
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.MEMO_TAG, tag.id]);
      SnackbarAPI.openSnackbar({
        text: `Updated memo for tag ${tag.title}`,
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
        tagId: tag.id,
        requestBody: {
          user_id: 1,
          project_id: tag.project_id,
          title: data.title,
          content: data.content,
        },
      });
    }
  };

  return (
    <MemoForm
      title={`Memo for tag ${tag.title}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateCodeMemo}
      isUpdateLoading={updateMutation.isLoading}
      isCreateLoading={createMutation.isLoading}
    />
  );
}
