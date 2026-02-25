import { memo, useCallback } from "react";
import { SubmitHandler } from "react-hook-form";
import { MemoHooks } from "../../../../api/MemoHooks";
import { AttachedObjectType } from "../../../../api/openapi/models/AttachedObjectType";
import { BBoxAnnotationRead } from "../../../../api/openapi/models/BBoxAnnotationRead";
import { CodeRead } from "../../../../api/openapi/models/CodeRead";
import { MemoRead } from "../../../../api/openapi/models/MemoRead";
import { ProjectRead } from "../../../../api/openapi/models/ProjectRead";
import { SentenceAnnotationRead } from "../../../../api/openapi/models/SentenceAnnotationRead";
import { SourceDocumentRead } from "../../../../api/openapi/models/SourceDocumentRead";
import { SpanAnnotationRead } from "../../../../api/openapi/models/SpanAnnotationRead";
import { TagRead } from "../../../../api/openapi/models/TagRead";
import { MemoCreateSuccessHandler } from "../_types/MemoCreateSuccessHandler";
import { MemoDialogForm, MemoFormValues } from "./MemoDialogForm";

interface MemoDialogContentProps {
  attachedObject:
    | TagRead
    | SourceDocumentRead
    | CodeRead
    | SpanAnnotationRead
    | SentenceAnnotationRead
    | BBoxAnnotationRead
    | ProjectRead;
  attachedObjectType: AttachedObjectType;
  memo: MemoRead | undefined;
  onMemoCreateSuccess?: MemoCreateSuccessHandler;
  closeDialog: () => void;
}

export const MemoDialogContent = memo(
  ({ attachedObject, attachedObjectType, memo, closeDialog, onMemoCreateSuccess }: MemoDialogContentProps) => {
    const { mutate: createMemo } = MemoHooks.useCreateMemo();
    const { mutate: updateMemo } = MemoHooks.useUpdateMemo();

    const handleCreateOrUpdateCodeMemo = useCallback<SubmitHandler<MemoFormValues>>(
      (data) => {
        if (memo) {
          updateMemo(
            {
              memoId: memo.id,
              requestBody: {
                title: data.title,
                content: data.content,
                content_json: data.content_json,
              },
            },
            {
              onSuccess: () => {
                closeDialog();
              },
            },
          );
        } else {
          createMemo(
            {
              attachedObjectId: attachedObject.id,
              attachedObjectType: attachedObjectType,
              requestBody: {
                title: data.title,
                content: data.content,
                content_json: data.content_json,
              },
            },
            {
              onSuccess: (data) => {
                if (onMemoCreateSuccess) onMemoCreateSuccess(data);
                closeDialog();
              },
            },
          );
        }
      },
      [memo, updateMemo, createMemo, attachedObject.id, attachedObjectType, closeDialog, onMemoCreateSuccess],
    );

    return (
      <MemoDialogForm
        key={memo?.id}
        memo={memo}
        handleCreateOrUpdateMemo={handleCreateOrUpdateCodeMemo}
        onDeleteClick={closeDialog}
        attachedObject={attachedObject}
        attachedObjectType={attachedObjectType}
      />
    );
  },
);
