/* eslint-disable boundaries/element-types */
// This file needs access to all dialog payload types and the registry, so it's simpler to keep everything in one place rather than splitting into multiple files.
import { AttachedObjectType } from "@models/AttachedObjectType";
import { CodeRead } from "@models/CodeRead";
import { FolderRead } from "@models/FolderRead";
import { MemoRead } from "@models/MemoRead";
import { TagRead } from "@models/TagRead";
import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";
import { useAppDispatch, useAppSelector, useAppStore } from "@store/storeHooks";
import { castDraft } from "immer";
import { useCallback } from "react";

// ─── Per-dialog data types ─────────────────────────────────────────────────────
// Each dialog defines its own named data type, even when it wraps a single model.
// This keeps the registry self-documenting and allows future expansion.

export interface TagCreateDialogData {
  tagName?: string;
}

export interface TagEditDialogData {
  tag: TagRead;
}

export interface CodeCreateDialogData {
  codeName?: string;
  parentCodeId?: number;
}

export interface CodeEditDialogData {
  code: CodeRead;
}

export interface FolderCreateDialogData {
  folderName?: string;
  parentFolderId?: number;
}

export interface FolderEditDialogData {
  folder: FolderRead;
}

export interface SpanAnnotationEditDialogData {
  annotationIds: number[];
}

export interface SentenceAnnotationEditDialogData {
  annotationIds: number[];
}

export interface BBoxAnnotationEditDialogData {
  annotationIds: number[];
}

/** Either an existing memo (by id) or a (potentially new) memo attached to an object. */
export type MemoDialogData =
  | { memoId: number; attachedObjectType?: AttachedObjectType; attachedObjectId?: number }
  | { memoId?: undefined; attachedObjectType: AttachedObjectType; attachedObjectId: number };

export interface ClusterDetailDialogData {
  clusterId: number;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Central map of every dialog key → its payload type.
 *
 * Adding a new dialog = one line here + one entry in `initialState` below.
 * `undefined` data means the dialog carries no payload (open/close only).
 */
export interface DialogPayloadMap {
  tagCreate: TagCreateDialogData;
  tagEdit: TagEditDialogData;
  codeCreate: CodeCreateDialogData;
  codeEdit: CodeEditDialogData;
  folderCreate: FolderCreateDialogData;
  folderEdit: FolderEditDialogData;
  spanAnnotationEdit: SpanAnnotationEditDialogData;
  sentenceAnnotationEdit: SentenceAnnotationEditDialogData;
  bboxAnnotationEdit: BBoxAnnotationEditDialogData;
  memo: MemoDialogData;
  clusterDetail: ClusterDetailDialogData;
  documentUpload: undefined;
  projectSettings: undefined;
  quickCommandMenu: undefined;
  codeShortcutManager: undefined;
}

// ─── Callback Registry ────────────────────────────────────────────────────────
// Defines the exact signature of the callback for each dialog.
// If a dialog doesn't have a callback, simply omit it from this map.
export interface DialogCallbackMap {
  codeCreate: (code: CodeRead, isNewCode: boolean) => void;
  spanAnnotationEdit: () => void;
  sentenceAnnotationEdit: () => void;
  bboxAnnotationEdit: () => void;
  memo: (memo: MemoRead) => void;
}

// Utility type to extract the callback for a given key, or undefined
export type DialogCallback<K extends keyof DialogPayloadMap> = K extends keyof DialogCallbackMap
  ? DialogCallbackMap[K]
  : undefined;

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

// ─── State shape ──────────────────────────────────────────────────────────────

export interface DialogEntry<T> {
  isOpen: boolean;
  data: T | undefined;
  callbackId?: string;
}

type DialogBusState = { [K in keyof DialogPayloadMap]: DialogEntry<DialogPayloadMap[K]> };

const closed = { isOpen: false, data: undefined, callbackId: undefined } as const;

const initialState: DialogBusState = {
  tagCreate: closed,
  tagEdit: closed,
  codeCreate: closed,
  codeEdit: closed,
  folderCreate: closed,
  folderEdit: closed,
  spanAnnotationEdit: closed,
  sentenceAnnotationEdit: closed,
  bboxAnnotationEdit: closed,
  memo: closed,
  clusterDetail: closed,
  documentUpload: closed,
  projectSettings: closed,
  quickCommandMenu: closed,
  codeShortcutManager: closed,
};

// ─── Action payload type ───────────────────────────────────────────────────────

/** Discriminated union — TypeScript narrows data based on key. */
type OpenPayload = {
  [K in keyof DialogPayloadMap]: { key: K; data: DialogPayloadMap[K]; callbackId?: string };
}[keyof DialogPayloadMap];

// ─── Slice ────────────────────────────────────────────────────────────────────

const dialogBusSlice = createSlice({
  name: "dialogBus",
  initialState,
  reducers: {
    open: (state, action: PayloadAction<OpenPayload>) => {
      const { key, data, callbackId } = action.payload;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state[key] as any).isOpen = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state[key] as any).data = castDraft(data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state[key] as any).callbackId = callbackId;
    },
    // keeps data and callbackId, so the content stays rendered during the exit transition
    // and can still report success when it unmounts (e.g. the memo editor flushing pending changes)
    close: (state, action: PayloadAction<keyof DialogPayloadMap>) => {
      state[action.payload].isOpen = false;
    },
    toggle: (state, action: PayloadAction<keyof DialogPayloadMap>) => {
      state[action.payload].isOpen = !state[action.payload].isOpen;
    },
  },
});

export const dialogBusReducer = { [dialogBusSlice.name]: dialogBusSlice.reducer };

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

      dispatch(dialogBusSlice.actions.open({ key, data, callbackId } as OpenPayload));
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
  return useCallback(() => dispatch(dialogBusSlice.actions.toggle(key)), [dispatch, key]);
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
    dispatch(dialogBusSlice.actions.close(key));
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
