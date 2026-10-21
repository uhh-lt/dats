import { useAppDispatch, useAppSelector, useAppStore } from "@store/storeHooks";
import { useCallback } from "react";
import {
  DialogBusActions,
  DialogCallback,
  DialogCallbackMap,
  DialogEntry,
  DialogPayloadMap,
  OpenPayload,
} from "./dialogBusSlice";

// ─── Callback store ───────────────────────────────────────────────────────────

type DialogSuccessFn<K extends keyof DialogPayloadMap> = K extends keyof DialogCallbackMap
  ? DialogCallbackMap[K]
  : undefined;

type StoredDialogCallback = (...args: unknown[]) => void;

// In-memory store for callbacks (kept OUTSIDE of Redux)
const dialogCallbacks = new Map<string, StoredDialogCallback>();

const keysWithCallbacks: ReadonlySet<keyof DialogCallbackMap> = new Set([
  "codeCreate",
  "spanAnnotationEdit",
  "sentenceAnnotationEdit",
  "bboxAnnotationEdit",
  "memo",
]);

function hasDialogSuccessCallback(key: keyof DialogPayloadMap): key is keyof DialogCallbackMap {
  return keysWithCallbacks.has(key as keyof DialogCallbackMap);
}

// ─── Typed hook helpers ────────────────────────────────────────────────────────

/** Return type for useOpenDialog: no-arg function for undefined-data dialogs, typed-arg otherwise. */
type OpenDialogFn<K extends keyof DialogPayloadMap> = DialogPayloadMap[K] extends undefined
  ? (data?: undefined, onSuccess?: DialogCallback<K>) => void
  : (data: DialogPayloadMap[K], onSuccess?: DialogCallback<K>) => void;

/**
 * Returns a stable callback that opens the given dialog.
 *
 * ```ts
 * const open = useOpenDialog("codeEdit");
 * open({ code });          // fully typed
 *
 * const openUpload = useOpenDialog("documentUpload");
 * openUpload();            // no argument needed
 * ```
 */
export function useOpenDialog<K extends keyof DialogPayloadMap>(key: K): OpenDialogFn<K> {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  return useCallback(
    (data?: DialogPayloadMap[K], onSuccess?: DialogCallback<K>) => {
      let callbackId: string | undefined;

      // the callback of the previous opening is no longer needed
      const previousCallbackId = store.getState().dialogBus[key].callbackId;
      if (previousCallbackId) dialogCallbacks.delete(previousCallbackId);

      if (onSuccess) {
        callbackId = `${String(key)}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        dialogCallbacks.set(callbackId, onSuccess as StoredDialogCallback);
      }

      dispatch(DialogBusActions.open({ key, data, callbackId } as OpenPayload));
    },

    [dispatch, key, store],
  ) as OpenDialogFn<K>;
}

/**
 * Returns a stable callback that toggles the given dialog.
 *
 * ```ts
 * const toggle = useToggleDialog("codeEdit");
 * toggle();                // toggles open/close
 * ```
 */
export function useToggleDialog(key: keyof DialogPayloadMap): () => void {
  const dispatch = useAppDispatch();
  return useCallback(() => dispatch(DialogBusActions.toggle(key)), [dispatch, key]);
}

/**
 * Unified dialog-internal hook.
 *
 * Use this inside dialog components to get everything a dialog needs:
 * - `isOpen`: whether the dialog is currently open
 * - `data`: typed payload for the dialog key
 * - `close()`: closes the dialog (data stays until the next opening, so the content can render the exit transition)
 * - `onSuccess(...)`: invokes the caller callback (if one was provided via `useOpenDialog`) and cleans it up
 *
 * For dialogs without a success callback, `onSuccess` is typed as `undefined`.
 *
 * ```ts
 * const { isOpen, data: dialogData, close: handleClose, onSuccess } = useDialogBus("codeCreate");
 *
 * // later in mutation success
 * onSuccess(createdCode, true);
 * handleClose();
 * ```
 */
export function useDialogBus<K extends keyof DialogPayloadMap>(
  key: K,
): {
  isOpen: boolean;
  data: DialogPayloadMap[K] | undefined;
  close: () => void;
  onSuccess: DialogSuccessFn<K>;
} {
  const dispatch = useAppDispatch();
  const dialogState = useAppSelector((state) => state.dialogBus[key]) as DialogEntry<DialogPayloadMap[K]>;

  const close = useCallback(() => {
    dispatch(DialogBusActions.close(key));
  }, [dispatch, key]);

  const executeSuccess = useCallback(
    (...args: unknown[]) => {
      if (!hasDialogSuccessCallback(key)) return;

      const callbackId = dialogState.callbackId;
      if (callbackId && dialogCallbacks.has(callbackId)) {
        const cb = dialogCallbacks.get(callbackId);
        cb?.(...args);
        dialogCallbacks.delete(callbackId);
      }
    },
    [dialogState.callbackId, key],
  );

  const onSuccess = hasDialogSuccessCallback(key)
    ? (executeSuccess as DialogSuccessFn<K>)
    : (undefined as DialogSuccessFn<K>);

  return { isOpen: dialogState.isOpen, data: dialogState.data, close, onSuccess };
}
