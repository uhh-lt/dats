Refactoring Plan: Removing Callbacks from Redux State

Context & Objective

Currently, the dialogBusSlice stores callback functions (like onSuccess, onEdit) directly inside the Redux state payloads. This violates Redux's strict rule against storing non-serializable data, leading to console warnings, broken time-travel debugging, and potential state persistence crashes.

Goal: Extract all callbacks from the Redux state into an external, module-scoped Map. Pass a serializable callbackId (string) through Redux to connect the caller to the dialog. Maintain strict TypeScript typing based on the dialog key for both the caller and the dialog component.

Step 1: Clean Up Payload Interfaces

Remove all function signatures from the DialogData interfaces. The Redux payload must only contain serializable data.

Target File: dialogBusSlice.ts (or equivalent where types are defined)

Action: Update the interfaces as follows:

export interface CodeCreateDialogData {
codeName?: string;
parentCodeId?: number;
// REMOVED: codeCreateSuccessHandler
}

export interface SpanAnnotationEditDialogData {
annotationIds: number[];
// REMOVED: onEdit
}

export interface SentenceAnnotationEditDialogData {
annotationIds: number[];
// REMOVED: onEdit
}

export interface BBoxAnnotationEditDialogData {
annotationIds: number[];
// REMOVED: onEdit
}

Step 2: Define the Callback Registry & Types

Create a parallel type map specifically for callbacks. This ensures strict typing when passing and consuming callbacks. Add the in-memory Map to hold the actual function references.

Action: Add this code block above the DialogPayloadMap:

// ─── Callback Registry ────────────────────────────────────────────────────────
// Defines the exact signature of the callback for each dialog.
// If a dialog doesn't have a callback, simply omit it from this map.
export interface DialogCallbackMap {
codeCreate: (code: CodeRead, isNewCode: boolean) => void;
spanAnnotationEdit: () => void;
sentenceAnnotationEdit: () => void;
bboxAnnotationEdit: () => void;
}

// Utility type to extract the callback for a given key, or undefined
export type DialogCallback<K extends keyof DialogPayloadMap> =
K extends keyof DialogCallbackMap ? DialogCallbackMap[K] : undefined;

// In-memory store for callbacks (kept OUTSIDE of Redux)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dialogCallbacks = new Map<string, (...args: any[]) => void>();

Step 3: Update Redux State Shape & Slice

Modify the Redux state to store an optional callbackId string instead of the function itself.

Action: Update DialogEntry, initialState, OpenPayload, and the slice reducers:

// ─── State shape ──────────────────────────────────────────────────────────────

export interface DialogEntry<T> {
isOpen: boolean;
data: T | undefined;
callbackId?: string; // <-- ADDED: tracks the external callback
}

type DialogBusState = { [K in keyof DialogPayloadMap]: DialogEntry<DialogPayloadMap[K]> };

const closed = { isOpen: false, data: undefined, callbackId: undefined } as const;

// ... initialState remains the same, using `closed`

// ─── Action payload type ───────────────────────────────────────────────────────

type OpenPayload = {
[K in keyof DialogPayloadMap]: {
key: K;
data: DialogPayloadMap[K];
callbackId?: string; // <-- ADDED
};
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
close: (state, action: PayloadAction<keyof DialogPayloadMap>) => {
state[action.payload].isOpen = false;
state[action.payload].data = undefined;
state[action.payload].callbackId = undefined; // <-- ADDED: cleanup state
},
toggle: (state, action: PayloadAction<keyof DialogPayloadMap>) => {
state[action.payload].isOpen = !state[action.payload].isOpen;
},
},
});

Step 4: Refactor the useOpenDialog Hook

Update the hook so callers can pass the strictly-typed callback. The hook will store the callback in the external Map, generate an ID, and dispatch the ID to Redux.

Action: Replace the existing useOpenDialog with this implementation:

// ─── Typed hook helpers ────────────────────────────────────────────────────────

type OpenDialogFn<K extends keyof DialogPayloadMap> = DialogPayloadMap[K] extends undefined
? (data?: undefined, onSuccess?: DialogCallback<K>) => void
: (data: DialogPayloadMap[K], onSuccess?: DialogCallback<K>) => void;

export function useOpenDialog<K extends keyof DialogPayloadMap>(key: K): OpenDialogFn<K> {
const dispatch = useAppDispatch();

return useCallback(
(data?: DialogPayloadMap[K], onSuccess?: DialogCallback<K>) => {
let callbackId;

      if (onSuccess) {
        // Generate a unique ID for the callback
        callbackId = `${key}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        // Store it in the external Map
        // eslint-disable-next-line @typescript-eslint/ban-types
        dialogCallbacks.set(callbackId, onSuccess as Function);
      }

      dispatch(dialogBusSlice.actions.open({ key, data, callbackId } as OpenPayload));
    },
    [dispatch, key],

) as OpenDialogFn<K>;
}

Step 5: Create useDialogSuccessCallback Hook

Create a new hook to be used inside the dialog components to execute the callback and prevent memory leaks.

Action: Add this new hook to the file:

/\*\*

- Hook to be used inside the actual Dialog components to trigger the callback.
- It is strictly typed based on the DialogCallbackMap.
- It automatically cleans up the callback from memory after execution.
  \*/
  export function useDialogSuccessCallback<K extends keyof DialogCallbackMap>(
  key: K
  ): DialogCallbackMap[K] {
  const dialogState = useAppSelector((state) => state.dialogBus[key]);

return useCallback((...args: any[]) => {
const callbackId = dialogState?.callbackId;

    if (callbackId && dialogCallbacks.has(callbackId)) {
      const cb = dialogCallbacks.get(callbackId);
      cb?.(...args); // Execute the callback
      dialogCallbacks.delete(callbackId); // IMPORTANT: Prevent memory leaks
    }

}, [dialogState?.callbackId]) as DialogCallbackMap[K];
}

Step 6: Update Component Usages (Instructions for Agent)

After updating the slice file, search the codebase for usages of useOpenDialog and the dialog components themselves, and update them.

Examples of Caller Updates:

Before:

const openCodeCreate = useOpenDialog("codeCreate");
openCodeCreate({
parentCodeId: 1,
codeCreateSuccessHandler: (code, isNew) => handleSuccess(code)
});

After:

const openCodeCreate = useOpenDialog("codeCreate");
openCodeCreate(
{ parentCodeId: 1 },
(code, isNew) => handleSuccess(code) // Now passed as the 2nd argument!
);

Examples of Dialog Component Updates (e.g., inside CodeCreateDialog.tsx):

Before:

const { data } = useDialogState("codeCreate");
// ... on API success ...
if (data?.codeCreateSuccessHandler) {
data.codeCreateSuccessHandler(newCode, true);
}

After:

const { data } = useDialogState("codeCreate");
const onSuccess = useDialogSuccessCallback("codeCreate"); // <-- New hook

// ... on API success ...
onSuccess(newCode, true); // Safely call it; hook handles undefined checks and memory cleanup
