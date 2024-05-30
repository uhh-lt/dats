import { SubmitHandler } from "react-hook-form";
import MemoHooks from "../../../api/MemoHooks.ts";
import SdocHooks from "../../../api/SdocHooks.ts";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import ConfirmationAPI from "../../../features/ConfirmationDialog/ConfirmationAPI.ts";
import { useOpenSnackbar } from "../../../features/SnackbarDialog/useOpenSnackbar.ts";
import { MemoContentProps } from "./MemoContentBboxAnnotation.tsx";
import { MemoForm, MemoFormValues } from "./MemoForm.tsx";

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

  // snackbar
  const openSnackbar = useOpenSnackbar();

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
            openSnackbar({
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
            openSnackbar({
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
                openSnackbar({
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
      isUpdateLoading={updateMutation.isPending}
      isCreateLoading={createMutation.isPending}
      isDeleteLoading={deleteMutation.isPending}
    />
  );
}
