---
applyTo: "frontend/src/**/*Dialog.tsx, frontend/src/store/global/dialogBus*.ts"
paths:
  - "frontend/src/**/*Dialog.tsx"
  - "frontend/src/store/global/dialogBus*.ts"
---

# Dialog Pattern

A `*Dialog.tsx` file is one MUI `Dialog` that creates, edits or selects something (a tag, an annotation's code, nodes for the whiteboard, ...) or runs a wizard. All dialogs look and behave the same (header, maximize, form, close on success), and each one gets its open state from exactly one of three sources, chosen by who opens it.

## File Structure

```tsx
// 1. Form values type (only if the form values differ from a generated model)
type CodeCreateValues = { ... };

// 2. Props interface, named <Name>DialogProps, not exported
interface CodeCreateDialogProps {
  projectId: number;
  onCodesCreated?: (idsToExpand: number[]) => void;
}

// 3. Plain function component (no memo)
export function CodeCreateDialog({ projectId, onCodesCreated }: CodeCreateDialogProps) {
  // 3.1 dialog state: useDialogBus(key) or useDialog() or the feature slice
  const { isOpen, data: dialogData, close: handleClose, onSuccess } = useDialogBus("codeCreate");

  // 3.2 queries for selections

  // 3.3 maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // 3.4 form + reset form when dialog opens
  const { handleSubmit, formState: { errors }, control, reset } = useForm<CodeCreateValues>();
  useEffect(() => {
    if (isOpen) reset({ ... });
  }, [isOpen, dialogData, reset]);

  // 3.5 form actions
  const { mutate: createCodeMutation, isPending } = CodeHooks.useCreateCode();
  const handleCodeCreation = useCallback<SubmitHandler<CodeCreateValues>>(
    (data) => createCodeMutation({ requestBody: { ... } }, { onSuccess: (code) => { onSuccess(code, true); handleClose(); } }),
    [...],
  );
  const handleError: SubmitErrorHandler<CodeCreateValues> = (data) => console.error(data);

  // 3.6 rendering
  return (
    <Dialog open={isOpen} onClose={closeOnEscape(handleClose)} maxWidth="md" fullWidth fullScreen={isMaximized}
      component="form" onSubmit={handleSubmit(handleCodeCreation, handleError)}>
      <DATSDialogHeader title="Create a new code" onClose={handleClose} isMaximized={isMaximized} onToggleMaximize={toggleMaximize} />
      <DialogContent>
        <Stack spacing={3}>{/* Form* inputs */}</Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" color="success" startIcon={<SaveIcon />} fullWidth type="submit" loading={isPending} loadingPosition="start">
          Create Code
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

## Rules

### Open State

The open state comes from exactly one of these three sources, chosen by who opens the dialog; never from `open`/`onClose` props or `useState` (lint). A dialog that opens itself on start passes `useDialog({ initialOpen })` (`WhatsNewDialog`).

| Opened from                                      | Source           | Mounted in                                                                           |
| ------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------ |
| several features (menus, tables, shortcuts, ...) | 1. dialog bus    | `routes/_auth/project/$projectId/route.tsx`, or `routes/_auth.tsx` outside a project |
| several places in one feature, or a wizard       | 2. feature slice | the feature's views (a wizard: the project route)                                    |
| one place: its own trigger                       | 3. `useDialog()` | the dialog renders its trigger                                                       |

1. **Dialog bus** (types and slice in `store/global/dialogBusSlice.ts`, hooks and the callback store in `store/global/dialogBusHooks.ts`): a global dialog, opened from several features (`TagEditDialog`, `SpanAnnotationEditDialog`, `ConfirmationDialog`). It is mounted exactly once, in `$projectId/route.tsx` (or `_auth.tsx` when it is needed outside a project), never in a view, so it opens wherever `useOpenDialog(key)` is called:
   - Dialog: `const { isOpen, data: dialogData, close: handleClose, onSuccess } = useDialogBus("key");`
   - Opener: `const openCodeEditDialog = useOpenDialog("codeEdit"); openCodeEditDialog({ code });`, or `openX(data, onSuccess)` with a callback.
   - A new key: a `<Name>DialogData` interface (always a named type, even for one field; `undefined` for no data), one line in `DialogPayloadMap`, one entry in `initialState`, and for a callback one line in `DialogCallbackMap` plus `keysWithCallbacks` (hooks file). The slice file follows the slice conventions and holds no React code.
   - Callbacks are kept outside Redux by the bus. Never put functions into a slice.
   - `close` keeps `data` (the content stays rendered during the exit transition). Gate content with `{dialogData && ...}`.
   - A domain may wrap the opener in a hook with its own signature (`useOpenMemoDialog`).
2. **Feature slice**: a dialog of one feature, opened from several places in it, or a wizard whose steps share state in the slice.
   - Feature dialog (`ClusterDetailDialog`, opened from the perspective view and the map): the slice holds `is<Name>DialogOpen` and the data it shows (`clusterDetailDialogClusterId`), with `open<Name>Dialog(data)` / `close<Name>Dialog()`; close keeps the data for the exit transition. The views that open it mount it.
   - Wizard (`ClassifierDialog`, `LLMAssistantDialog`): open state (`isOpen`), step and settings live in the slice; openers dispatch the slice's open action with the initial payload. Wizards are opened from other features too, so they are mounted in the project route.
   - A feature slice holds no callbacks; a dialog that reports back to its opener uses the bus.
3. **Self-contained**: the dialog has exactly one opener, its own trigger. The dialog renders the trigger and the `Dialog` in a fragment and holds the state with `const { isOpen, open: handleOpen, close: handleClose } = useDialog();` from `@hooks/useDialog`. The trigger is styled by the dialog; whiteboard toolbar dialogs accept `buttonProps?: Omit<ButtonProps, "onClick">`.

- Local cleanup on close (row selection, a created API key): wrap the bus' close (`close: closeDialog` + `handleClose` that resets and calls `closeDialog`), or pass `useDialog({ onClose })`. Do not `setState` in the open effect.

### Header and Closing

- Every dialog renders `DATSDialogHeader` with `useDialogMaximize` and passes `fullScreen={isMaximized}` to `Dialog` (lint). Never `DialogTitle`.
- Every dialog closes on Escape and on the header's X, never on a click on the backdrop (a stray click must not throw away its input): `onClose={closeOnEscape(handleClose)}` from `@utils/dialogUtils` (lint `local/dialog-close-on-escape`, for every `<Dialog>`, also outside `*Dialog.tsx`).
- Tables (`CodeTable`, `*ReduxFilterTable`) go directly into the `Dialog`, forms and text into `DialogContent`.
- Something that blocks a page while it is computing is not a dialog: the view renders the progress instead of its content (the perspectives map shows `ClusterJobProgressCard` while its job runs).

### Forms

- `useForm<Values>()` without `defaultValues`; reset the values with `reset({...})` in a `useEffect` when `isOpen` becomes true, from `dialogData` for edit dialogs.
- Inputs are the `Form*` components from `@components/form-inputs` with `rules`, `error: Boolean(errors.x)` and `helperText: <ErrorMessage errors={errors} name="x" />` (a field with a hint: `helperText: errors.x?.message || "hint"`). Numbers use `FormNumber`, which stores a `number` (`null` while empty), never the input string. A raw `Controller` + `TextField` only where no `Form*` component fits.
- `Dialog` gets `component="form"` and `onSubmit={handleSubmit(handle<Entity><Action>, handleError)}`; the submit button is `type="submit"`.
- Submit handler: `handle<Entity><Action>` (`handleTagCreation`, `handleCodeUpdate`), wrapped in `useCallback<SubmitHandler<Values>>`. Error handler: `const handleError: SubmitErrorHandler<Values> = (data) => console.error(data);`.
- Mutations are destructured: `const { mutate: createTagMutation, isPending } = TagHooks.useCreateTag();` (lint, no `x.mutate(...)`). In the `mutate` call's `onSuccess`, close the dialog and call the bus `onSuccess` / navigate.
- Primary button: `variant="contained" color="success" startIcon={<SaveIcon />} fullWidth loading={isPending} loadingPosition="start"`, label `Create X` / `Update X`. A delete button goes before it with `color="error" startIcon={<DeleteIcon />} sx={{ flexShrink: 0 }}` and asks via `useOpenConfirmationDialog`.

### Component

- `export function XDialog(...)`, never `memo()` (lint): a closed MUI `Dialog` does not render its children.
- Props interface `<Name>DialogProps`, not exported, never `extends ButtonProps`. Pass the context the content needs (`projectId`), not the open state.
- Sub-components for heavy content (`XDialogContent`) live in the same file and get `onClose`.

## Examples

See:

- [CodeCreateDialog.tsx](../../frontend/src/core/code/dialog/CodeCreateDialog.tsx) — bus dialog with form, reset on open, mutation, callback
- [TagEditDialog.tsx](../../frontend/src/core/tag/dialog/TagEditDialog.tsx) — bus edit dialog with delete + confirmation
- [ClusterCreationDialog.tsx](../../frontend/src/features/perspectives/views/map/_components/panel-settings/ClusterCreationDialog.tsx) — self-contained form dialog with its own trigger
- [AddCodeNodeDialog.tsx](../../frontend/src/features/whiteboard/views/board/_components/toolbar/AddCodeNodeDialog.tsx) — self-contained table selection dialog
- [ClassifierDialog.tsx](../../frontend/src/features/classifier/views/dialog/ClassifierDialog.tsx) — wizard dialog driven by its feature slice
