/* eslint-disable boundaries/element-types */
// This file needs access to all dialog payload types and the registry, so it's simpler to keep everything in one place rather than splitting into multiple files.
import { AttachedObjectType } from "@models/AttachedObjectType";
import { CodeRead } from "@models/CodeRead";
import { FolderRead } from "@models/FolderRead";
import { MemoRead } from "@models/MemoRead";
import { TagRead } from "@models/TagRead";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { castDraft } from "immer";

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

export interface ConfirmationDialogData {
  text: string;
  type?: "DELETE";
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
  documentUpload: undefined;
  projectSettings: undefined;
  quickCommandMenu: undefined;
  codeShortcutManager: undefined;
  confirmation: ConfirmationDialogData;
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
  confirmation: (accepted: boolean) => void;
}

// Utility type to extract the callback for a given key, or undefined
export type DialogCallback<K extends keyof DialogPayloadMap> = K extends keyof DialogCallbackMap
  ? DialogCallbackMap[K]
  : undefined;

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
  documentUpload: closed,
  projectSettings: closed,
  quickCommandMenu: closed,
  codeShortcutManager: closed,
  confirmation: closed,
};

// ─── Action payload type ───────────────────────────────────────────────────────

/** Discriminated union — TypeScript narrows data based on key. */
export type OpenPayload = {
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

export const DialogBusActions = dialogBusSlice.actions;

export const dialogBusReducer = { [dialogBusSlice.name]: dialogBusSlice.reducer };
