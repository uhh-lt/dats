/* eslint-disable boundaries/element-types */
// This file needs access to all dialog payload types and the registry, so it's simpler to keep everything in one place rather than splitting into multiple files.
import { CodeRead } from "@api/models/CodeRead";
import { FolderRead } from "@api/models/FolderRead";
import { TagRead } from "@api/models/TagRead";
import { PayloadAction, createSlice } from "@reduxjs/toolkit/react";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
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

export type CodeCreateSuccessHandler = ((code: CodeRead, isNewCode: boolean) => void) | undefined;

export interface CodeCreateDialogData {
  codeName?: string;
  parentCodeId?: number;
  codeCreateSuccessHandler?: CodeCreateSuccessHandler;
}

export interface CodeEditDialogData {
  code: CodeRead;
}

export interface FolderCreateDialogData {
  folderName?: string;
}

export interface FolderEditDialogData {
  folder: FolderRead;
}

export interface SpanAnnotationEditDialogData {
  annotationIds: number[];
  onEdit?: () => void;
}

export interface SentenceAnnotationEditDialogData {
  annotationIds: number[];
  onEdit?: () => void;
}

export interface BBoxAnnotationEditDialogData {
  annotationIds: number[];
  onEdit?: () => void;
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
  documentUpload: undefined;
  projectSettings: undefined;
  quickCommandMenu: undefined;
}

// ─── State shape ──────────────────────────────────────────────────────────────

export interface DialogEntry<T> {
  isOpen: boolean;
  data: T | undefined;
}

type DialogBusState = { [K in keyof DialogPayloadMap]: DialogEntry<DialogPayloadMap[K]> };

const closed = { isOpen: false, data: undefined } as const;

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
  documentUpload: closed,
  projectSettings: closed,
  quickCommandMenu: closed,
};

// ─── Action payload type ───────────────────────────────────────────────────────

/** Discriminated union — TypeScript narrows data based on key. */
type OpenPayload = {
  [K in keyof DialogPayloadMap]: { key: K; data: DialogPayloadMap[K] };
}[keyof DialogPayloadMap];

// ─── Slice ────────────────────────────────────────────────────────────────────

const dialogBusSlice = createSlice({
  name: "dialogBus",
  initialState,
  reducers: {
    open: (state, action: PayloadAction<OpenPayload>) => {
      const { key, data } = action.payload;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state[key] as any).isOpen = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state[key] as any).data = castDraft(data);
    },
    close: (state, action: PayloadAction<keyof DialogPayloadMap>) => {
      state[action.payload].isOpen = false;
      state[action.payload].data = undefined;
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
  ? () => void
  : (data: DialogPayloadMap[K]) => void;

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
  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data?: any) => dispatch(dialogBusSlice.actions.open({ key, data } as OpenPayload)),

    [dispatch, key],
  ) as OpenDialogFn<K>;
}

/** Returns a stable callback that closes the given dialog. */
export function useCloseDialog(key: keyof DialogPayloadMap): () => void {
  const dispatch = useAppDispatch();
  return useCallback(() => dispatch(dialogBusSlice.actions.close(key)), [dispatch, key]);
}

/** Returns a stable callback that toggles the given dialog. */
export function useToggleDialog(key: keyof DialogPayloadMap): () => void {
  const dispatch = useAppDispatch();
  return useCallback(() => dispatch(dialogBusSlice.actions.toggle(key)), [dispatch, key]);
}

/** Selects the full `{ isOpen, data }` entry for the given dialog. */
export function useDialogState<K extends keyof DialogPayloadMap>(key: K): DialogEntry<DialogPayloadMap[K]> {
  return useAppSelector((state) => state.dialogBus[key]) as DialogEntry<DialogPayloadMap[K]>;
}
