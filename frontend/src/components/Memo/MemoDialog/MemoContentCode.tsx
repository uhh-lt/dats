import { SubmitHandler } from "react-hook-form";
import CodeHooks from "../../../api/CodeHooks.ts";
import MemoHooks from "../../../api/MemoHooks.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import ConfirmationAPI from "../../ConfirmationDialog/ConfirmationAPI.ts";
import { MemoContentProps } from "./MemoContentBboxAnnotation.tsx";
import { MemoForm, MemoFormValues } from "./MemoForm.tsx";

interface MemoContentCodeProps {
  code: CodeRead;
}

export function MemoContentCode({
  code,
  memo,
  closeDialog,
  onMemoCreateSuccess,
}: MemoContentCodeProps & MemoContentProps) {
  // mutations
  const createMutation = CodeHooks.useCreateMemo();
  const updateMutation = MemoHooks.useUpdateMemo();
  const deleteMutation = MemoHooks.useDeleteMemo();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // form handling
  const handleCreateOrUpdateCodeMemo: SubmitHandler<MemoFormValues> = (data) => {
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
            openSnackbar({
              text: `Updated memo for code ${code.name}`,
              severity: "success",
            });
            closeDialog();
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          codeId: code.id,
          requestBody: {
            title: data.title,
            content: data.content,
            content_json: "",
          },
        },
        {
          onSuccess: (data) => {
            openSnackbar({
              text: `Created memo for code ${code.name}`,
              severity: "success",
            });
            if (onMemoCreateSuccess) onMemoCreateSuccess(data);
            closeDialog();
          },
        },
      );
    }
  };
  const handleDeleteCodeMemo = () => {
    if (memo) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to remove the Code Memo "${memo.title}"? This action cannot be undone!`,
        onAccept: () => {
          deleteMutation.mutate(
            { memoId: memo.id },
            {
              onSuccess: () => {
                openSnackbar({
                  text: `Deleted memo for code ${code.name}`,
                  severity: "success",
                });
                closeDialog();
              },
            },
          );
        },
      });
    } else {
      throw Error("Invalid invocation of handleDeleteCodeMemo. No memo to delete.");
    }
  };

  return (
    <MemoForm
      key={memo?.id}
      title={`Memo for code ${code.name}`}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateCodeMemo}
      handleDeleteMemo={handleDeleteCodeMemo}
      isUpdateLoading={updateMutation.isPending}
      isCreateLoading={createMutation.isPending}
      isDeleteLoading={deleteMutation.isPending}
    />
  );
}
