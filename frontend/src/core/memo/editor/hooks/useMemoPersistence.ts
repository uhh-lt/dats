import { MemoHooks } from "@api/hooks/MemoHooks";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { MemoRead } from "@models/MemoRead";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MemoAttachedObject } from "./useMemoEditorData";

export interface MemoFormValues {
  title: string;
  icon: string | null;
  content: string;
  content_json: string;
}

interface UseMemoPersistenceParams {
  memo: MemoRead | undefined;
  attachedObject: MemoAttachedObject;
  attachedObjectType: AttachedObjectType;
  onMemoCreateSuccess?: ((memo: MemoRead) => void) | undefined;
}

interface UseMemoPersistenceResult {
  /** The current draft. Initialize the BlockNote editor with formData.content_json. */
  formData: MemoFormValues;
  handleTitleChange: (title: string) => void;
  handleContentChange: (content: string, contentJson: string) => void;
  handleIconChange: (icon: string | null) => void;
  /** Discard pending (queued but unsaved) changes. Call before deleting or closing. */
  discardPendingChanges: () => void;
}

const AUTOSAVE_DELAY = 2000;

const areFormValuesEqual = (left: MemoFormValues, right: MemoFormValues) =>
  left.title === right.title &&
  left.icon === right.icon &&
  left.content === right.content &&
  left.content_json === right.content_json;

/**
 * Owns the memo draft and its persistence: local form state, debounced autosave,
 * flush-on-unmount, create-vs-update resolution and a serialized save queue.
 * Saved memos are written back to the React Query cache by the mutation hooks,
 * so consumers always read fresh data from useGetMemo.
 *
 * Mount one instance per editor (containers key the editor subtree by memo id,
 * so a target change remounts and resets the draft).
 */
export function useMemoPersistence({
  memo,
  attachedObject,
  attachedObjectType,
  onMemoCreateSuccess,
}: UseMemoPersistenceParams): UseMemoPersistenceResult {
  // --- draft state ---
  const initialFormData = useMemo<MemoFormValues>(
    () => ({
      title: memo?.title ?? "",
      icon: memo?.icon ?? null,
      content: memo?.content ?? "",
      content_json: memo?.content_json ?? "",
    }),
    [memo?.content, memo?.content_json, memo?.icon, memo?.title],
  );
  const [formData, setFormData] = useState(initialFormData);
  const formDataRef = useRef(initialFormData);
  const lastQueuedFormDataRef = useRef(initialFormData);
  const hasPersistedMemoRef = useRef(Boolean(memo));
  const discardPendingChangesRef = useRef(false);

  // Track whether a persisted memo ever existed (refs must not be written during render)
  useEffect(() => {
    hasPersistedMemoRef.current = hasPersistedMemoRef.current || Boolean(memo);
  }, [memo]);

  const updateFormData = useCallback((patch: Partial<MemoFormValues>) => {
    const nextFormData = { ...formDataRef.current, ...patch };
    formDataRef.current = nextFormData;
    setFormData(nextFormData);
  }, []);

  const handleTitleChange = useCallback((title: string) => updateFormData({ title }), [updateFormData]);
  const handleContentChange = useCallback(
    (content: string, contentJson: string) => updateFormData({ content, content_json: contentJson }),
    [updateFormData],
  );
  const handleIconChange = useCallback((icon: string | null) => updateFormData({ icon }), [updateFormData]);

  // --- persistence ---
  const currentMemoIdRef = useRef(memo?.id);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const { mutateAsync: createMemo } = MemoHooks.useCreateMemo();
  const { mutateAsync: updateMemo } = MemoHooks.useUpdateMemo();

  const persistMemo = useCallback(
    (values: MemoFormValues) => {
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const requestBody = {
            title: values.title,
            icon: values.icon,
            content: values.content,
            content_json: values.content_json,
          };

          if (currentMemoIdRef.current) {
            await updateMemo({ memoId: currentMemoIdRef.current, requestBody });
          } else {
            const savedMemo = await createMemo({
              attachedObjectId: attachedObject.id,
              attachedObjectType,
              requestBody,
            });
            currentMemoIdRef.current = savedMemo.id;
            onMemoCreateSuccess?.(savedMemo);
          }
        });
    },
    [attachedObject.id, attachedObjectType, createMemo, onMemoCreateSuccess, updateMemo],
  );

  const persistPendingChanges = useCallback(() => {
    if (discardPendingChangesRef.current) {
      return;
    }

    const currentFormData = formDataRef.current;
    if (areFormValuesEqual(currentFormData, lastQueuedFormDataRef.current)) {
      return;
    }

    const hasMeaningfulContent = currentFormData.title.trim() !== "" || currentFormData.content.trim() !== "";
    if (!hasPersistedMemoRef.current && !hasMeaningfulContent) {
      return;
    }

    lastQueuedFormDataRef.current = currentFormData;
    hasPersistedMemoRef.current = true;
    persistMemo(currentFormData);
  }, [persistMemo]);

  const persistPendingChangesRef = useRef(persistPendingChanges);

  // Keep the latest persist callback in a ref (refs must not be written during render)
  useEffect(() => {
    persistPendingChangesRef.current = persistPendingChanges;
  }, [persistPendingChanges]);

  // Debounced autosave
  useEffect(() => {
    const timeout = window.setTimeout(persistPendingChanges, AUTOSAVE_DELAY);
    return () => window.clearTimeout(timeout);
  }, [formData, persistPendingChanges]);

  // Flush pending changes on unmount
  useEffect(() => {
    return () => {
      persistPendingChangesRef.current();
    };
  }, []);

  const discardPendingChanges = useCallback(() => {
    discardPendingChangesRef.current = true;
  }, []);

  return { formData, handleTitleChange, handleContentChange, handleIconChange, discardPendingChanges };
}
